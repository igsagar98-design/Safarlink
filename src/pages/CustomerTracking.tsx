import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCustomerTripByToken,
  listTripEvents,
  postTripEvent,
  type TripEvent,
  type Trip,
} from '@/lib/api';
import { getStatusLabel, getStatusClass, calculateTripStatus, timeAgo } from '@/lib/risk-logic';
import { format } from 'date-fns';
import { Truck, MapPin, Package, Clock, Building, AlertTriangle, Navigation, ExternalLink } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import TripTimeline from '@/components/TripTimeline';
import TrackingMap from '@/components/TrackingMap';
import { supabase } from '@/integrations/supabase/client';

const TRACKING_REFRESH_INTERVAL_MS = 30 * 1000;
const STALE_AFTER_MS = 90 * 1000;
const OFFLINE_AFTER_MS = 180 * 1000;

type TrackingState = 'live' | 'stale' | 'paused' | 'stopped';
type TrackingMode = 'driver_link' | 'external_gps_link';

const hasCoordinatePair = (latitude: number | null | undefined, longitude: number | null | undefined) =>
  typeof latitude === 'number' && typeof longitude === 'number';

const getTrackingMode = (tripData: Trip): TrackingMode =>
  tripData.gps_tracking_link ? 'external_gps_link' : 'driver_link';

export default function CustomerTracking() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);

  const formatKm = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

  const getTrackingState = (tripData: Trip, tripEvents: TripEvent[]): TrackingState => {
    const latestControlEvent = [...tripEvents]
      .filter((event) => event.event_type === 'tracking_stopped' || event.event_type === 'tracking_paused' || event.event_type === 'tracking_started')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (latestControlEvent?.event_type === 'tracking_stopped') return 'stopped';
    if (latestControlEvent?.event_type === 'tracking_paused') return 'paused';

    const lastUpdateAt = tripData.last_update_at;
    if (!lastUpdateAt) return 'stale';

    const ageMs = Date.now() - new Date(lastUpdateAt).getTime();
    if (ageMs >= OFFLINE_AFTER_MS) return 'stale';
    if (ageMs >= STALE_AFTER_MS) return 'stale';
    return 'live';
  };

  const getLocationHealth = (
    tripData: Trip,
    trackingState: TrackingState,
    trackingMode: TrackingMode,
  ) => {
    const hasDriverCoordinates = hasCoordinatePair(tripData.last_latitude, tripData.last_longitude);

    if (trackingState === 'stopped') {
      return {
        label: 'Tracking stopped',
        className: 'bg-rose-50 text-rose-700 border border-rose-200',
      };
    }

    if (trackingState === 'paused') {
      return {
        label: 'Tracking paused',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    }

    if (trackingMode === 'external_gps_link' && tripData.gps_tracking_link && !hasDriverCoordinates) {
      return {
        label: 'External GPS link connected',
        className: 'bg-sky-50 text-sky-700 border border-sky-200',
      };
    }

    if (!hasDriverCoordinates) {
      return {
        label: 'Awaiting first driver location',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    }

    if (!tripData.last_update_at) {
      return {
        label: 'Live location',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    }

    const ageMs = Date.now() - new Date(tripData.last_update_at).getTime();
    if (ageMs >= OFFLINE_AFTER_MS) {
      return {
        label: 'Driver offline',
        className: 'bg-rose-50 text-rose-700 border border-rose-200',
      };
    }

    if (ageMs >= STALE_AFTER_MS) {
      return {
        label: 'Location stale',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    }

    return {
      label: 'Live location',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  };

  const fetchTrip = async () => {
    if (!token) return;
    try {
      const data = await getCustomerTripByToken(token);
      if (!data) {
        setError('Tracking link not found.');
        setTrip(null);
        return;
      }

      setError('');
      setTrip(data);

      try {
        const tripEvents = await listTripEvents(data.id);
        setEvents(tripEvents);

        const trackingState = getTrackingState(data, tripEvents);
        if (trackingState === 'stale' && data.last_update_at) {
          const hasRecentStaleEvent = tripEvents.some((event) => {
            if (event.event_type !== 'tracking_stale') return false;
            const ageMs = Date.now() - new Date(event.created_at).getTime();
            return ageMs < STALE_AFTER_MS;
          });

          if (!hasRecentStaleEvent) {
            postTripEvent(data.id, 'tracking_stale', {
              note: 'No GPS updates received recently',
            }).catch(() => {
              // Non-blocking stale milestone logging.
            });
          }
        }
      } catch {
        setEvents([]);
      }
    } catch {
      setError('Tracking link not found.');
      setTrip(null);
      setEvents([]);
    } finally {
      setLoading(false);
      setLastPolledAt(new Date().toISOString());
    }
  };

  useEffect(() => {
    fetchTrip();
    const interval = setInterval(fetchTrip, TRACKING_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!trip?.id) return;

    const channel = supabase
      .channel(`customer-tracking-${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${trip.id}`,
        },
        () => {
          void fetchTrip();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [trip?.id]);


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-2" />
          <p className="text-foreground font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const status = calculateTripStatus(trip);
  const trackingState = getTrackingState(trip, events);
  const trackingMode = getTrackingMode(trip);
  const hasDriverCoordinates = hasCoordinatePair(trip.last_driver_latitude, trip.last_driver_longitude);
  const shouldShowExternalTrackingLink =
    trackingMode === 'external_gps_link' && Boolean(trip.gps_tracking_link) && !hasDriverCoordinates;
  const locationHealth = getLocationHealth(trip, trackingState, trackingMode);

  const rows = [
    { icon: Truck, label: 'Vehicle', value: trip.vehicle_number },
    { icon: Package, label: 'Material', value: trip.material },
    { icon: Building, label: 'Transporter', value: trip.transporter_name },
    { icon: MapPin, label: 'Origin', value: trip.origin },
    { icon: Navigation, label: 'Destination', value: trip.destination },
    { icon: Clock, label: 'Planned Arrival', value: format(new Date(trip.planned_arrival), 'dd MMM yyyy, HH:mm') },
    {
      icon: Clock,
      label: 'Predicted ETA',
      value: (
        <div className="flex flex-col">
          <span>
            {trip.predicted_eta_at 
              ? format(new Date(trip.predicted_eta_at), 'dd MMM yyyy, HH:mm')
              : 'Calculating...'}
          </span>
          {trip.last_eta_calculated_at && (
            <span className="text-[10px] text-muted-foreground">
              {trip.is_live_tracking ? 'Auto-updating' : `Stale (last updated ${timeAgo(trip.last_eta_calculated_at)})`}
            </span>
          )}
        </div>
      ),
    },
    {
      icon: AlertTriangle,
      label: 'Delay',
      value:
        typeof trip.predicted_eta_minutes === 'number' // Or delay limit
          ? (trip.delay_minutes && trip.delay_minutes > 0 ? `${trip.delay_minutes} min delayed` : 'No delay predicted')
          : (typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0
              ? `${trip.delay_minutes} min delayed`
              : 'No delay predicted'),
    },
    {
      icon: MapPin,
      label: 'Last Location',
      value: trip.last_location_name || (hasDriverCoordinates
        ? 'Live marker shown on map'
        : (trackingMode === 'external_gps_link'
            ? 'Live tracking available via GPS link'
            : 'Awaiting first driver location')),
    },
    { icon: Clock, label: 'Last Update', value: timeAgo(trip.last_driver_location_at || trip.last_update_at) },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary mb-2">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-lg">Shipment Tracking</h1>
          <p className="text-xs text-muted-foreground">Real-time visibility</p>
        </div>

        {/* Status banner */}
        <div className={`rounded-xl p-4 text-center ${getStatusClass(status)}`}>
          <p className="text-sm font-medium">Current Status</p>
          <p className="text-2xl font-display font-bold">{getStatusLabel(status)}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${locationHealth.className}`}>
              {locationHealth.label}
            </span>
          </div>
        </div>

        {typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0 && (
          <div className="card-elevated p-3 border-warning/40 bg-warning/10">
            <p className="text-xs font-medium text-warning">
              Delay warning: predicted arrival is {trip.delay_minutes} minutes later than planned.
            </p>
          </div>
        )}

        <TrackingMap
          pickup={
            typeof trip.pickup_latitude === 'number' && typeof trip.pickup_longitude === 'number'
              ? { lat: trip.pickup_latitude, lng: trip.pickup_longitude }
              : null
          }
          drop={
            typeof trip.drop_latitude === 'number' && typeof trip.drop_longitude === 'number'
              ? { lat: trip.drop_latitude, lng: trip.drop_longitude }
              : null
          }
          driver={
            hasDriverCoordinates
              ? { lat: trip.last_driver_latitude!, lng: trip.last_driver_longitude! }
              : null
          }
          zoom={10}
          className="h-64"
        />

        {shouldShowExternalTrackingLink && trip.gps_tracking_link && (
          <div className="card-elevated p-4 space-y-2">
            <p className="text-sm font-medium">Live tracking available via GPS link</p>
            <p className="text-xs text-muted-foreground">
              External GPS provider is connected for this shipment. Open the provider link to view real-time movement.
            </p>
            <a href={trip.gps_tracking_link} target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Live Tracking
              </Button>
            </a>
          </div>
        )}

        {/* Progress */}
        <div className="card-elevated p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{trip.origin}</span>
            <span>{trip.destination}</span>
          </div>
          <Progress value={trip.route_progress_percent ?? 0} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {trip.route_progress_percent !== null && trip.route_progress_percent !== undefined
              ? `${trip.route_progress_percent}% route progress`
              : 'Route progress unavailable'}
          </p>
          {(trip.route_distance_meters || trip.remaining_distance_meters) && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              {trip.route_distance_meters && <p>Total distance: {formatKm(trip.route_distance_meters)}</p>}
              {trip.remaining_distance_meters !== null && trip.remaining_distance_meters !== undefined && (
                <p>Remaining: {formatKm(trip.remaining_distance_meters)}</p>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card-elevated p-4 space-y-3">
          {rows.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-28 shrink-0">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="card-elevated p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Trip Timeline</p>
          <TripTimeline events={events} />
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Live updates active (Realtime){lastPolledAt ? ` • Last sync ${format(new Date(lastPolledAt), 'HH:mm:ss')}` : ''}
        </p>
      </div>
    </div>
  );
}
