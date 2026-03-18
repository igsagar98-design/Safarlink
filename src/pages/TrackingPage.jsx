import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TrackingMap from '@/components/TrackingMap';
import { getCustomerTripByToken, getDriverTripByToken } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

function parseLatLngText(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 2) return null;
  if (!Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { lat: parts[0], lng: parts[1] };
}

async function geocodeAddress(address, apiKey) {
  if (!address || !apiKey) return null;

  const fallbackCoordinate = parseLatLngText(address);
  if (fallbackCoordinate) return fallbackCoordinate;

  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const data = await response.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return null;
    }
    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trip, setTrip] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const driverToken = searchParams.get('driverToken');
        const customerToken = searchParams.get('customerToken');

        let selectedTrip = null;
        if (driverToken) {
          selectedTrip = await getDriverTripByToken(driverToken);
        } else if (customerToken) {
          selectedTrip = await getCustomerTripByToken(customerToken);
        } else {
          const { data, error: queryError } = await supabase
            .from('trips')
            .select('id, vehicle_number, origin, destination, last_latitude, last_longitude, last_update_at')
            .order('last_update_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (queryError) throw queryError;
          selectedTrip = data;
        }

        if (!selectedTrip) {
          setError('No trip found for tracking.');
          setTrip(null);
          setPickup(null);
          setDrop(null);
          return;
        }

        setTrip(selectedTrip);

        const [pickupCoord, dropCoord] = await Promise.all([
          geocodeAddress(selectedTrip.origin, googleApiKey),
          geocodeAddress(selectedTrip.destination, googleApiKey),
        ]);

        setPickup(pickupCoord);
        setDrop(dropCoord);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load tracking map';
        setError(message);
        setTrip(null);
        setPickup(null);
        setDrop(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [googleApiKey, searchParams]);

  const driver = useMemo(() => {
    if (!trip) return null;
    if (typeof trip.last_latitude !== 'number' || typeof trip.last_longitude !== 'number') {
      return null;
    }
    return { lat: trip.last_latitude, lng: trip.last_longitude };
  }, [trip]);

  const trackingMode = useMemo(() => {
    if (!trip) return 'driver_link';
    return trip.gps_tracking_link ? 'external_gps_link' : 'driver_link';
  }, [trip]);

  const showExternalLinkOnly = Boolean(
    trip
    && trackingMode === 'external_gps_link'
    && trip.gps_tracking_link
    && !driver
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Live Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Monitor driver, pickup, and drop locations in real time.
          </p>
        </div>

        {loading && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Loading live trip and map coordinates...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">Unable to load tracking</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <TrackingMap
              pickup={pickup}
              drop={drop}
              driver={driver}
              zoom={9}
              className="h-[55vh] min-h-[320px]"
            />

            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Live Trip</h2>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <span className="font-medium text-foreground">Vehicle:</span>{' '}
                  {trip?.vehicle_number || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Origin:</span>{' '}
                  {trip?.origin || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Destination:</span>{' '}
                  {trip?.destination || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Driver:</span>{' '}
                  {driver
                    ? `${driver.lat}, ${driver.lng}`
                    : (showExternalLinkOnly ? 'Live tracking available via GPS link' : 'Awaiting first driver location')}
                </p>
              </div>
              {showExternalLinkOnly && (
                <a href={trip.gps_tracking_link} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Live Tracking
                  </Button>
                </a>
              )}
              <p className="text-xs text-muted-foreground">
                You can pass `?driverToken=...` or `?customerToken=...` in URL to load a specific trip.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
