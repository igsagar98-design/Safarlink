import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getCustomerTripByToken,
  getRouteProgress,
  listTripEvents,
  type RouteProgressResult,
  type TripEvent,
  type Trip,
} from '@/lib/api';
import { getStatusLabel, getStatusClass, calculateTripStatus, timeAgo } from '@/lib/risk-logic';
import { format } from 'date-fns';
import { Truck, MapPin, Package, Clock, Building, AlertTriangle, Navigation } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import TripTimeline from '@/components/TripTimeline';
import TrackingMap from '@/components/TrackingMap';

const TRACKING_REFRESH_INTERVAL_MS = 5 * 1000;
const STALE_AFTER_MS = 30 * 1000;
const OFFLINE_AFTER_MS = 120 * 1000;

export default function CustomerTracking() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgressResult | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);

  const formatKm = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

  const getLocationHealth = (lastUpdateAt: string | null | undefined) => {
    if (!lastUpdateAt) {
      return {
        label: 'Awaiting first location',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      };
    }

    const ageMs = Date.now() - new Date(lastUpdateAt).getTime();
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
      } catch {
        setEvents([]);
      }

      try {
        const progress = await getRouteProgress({
          origin: data.origin,
          destination: data.destination,
          currentLatitude: data.last_latitude,
          currentLongitude: data.last_longitude,
        });
        setRouteProgress(progress);
          } catch (err) {
              console.error('Route progress failed with input:', {
                origin: data.origin,
                destination: data.destination,
                lat: data.last_latitude,
                lng: data.last_longitude,
              });
              console.error('Error details:', err instanceof Error ? err.message : String(err));
              setRouteProgress(null);
      }
    } catch {
      setError('Tracking link not found.');
      setTrip(null);
      setRouteProgress(null);
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
      value: trip.predicted_arrival
        ? format(new Date(trip.predicted_arrival), 'dd MMM yyyy, HH:mm')
        : (trip.current_eta ? format(new Date(trip.current_eta), 'dd MMM yyyy, HH:mm') : 'Same as planned'),
    },
    {
      icon: AlertTriangle,
      label: 'Delay',
      value:
        typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0
          ? `${trip.delay_minutes} min delayed`
          : 'No delay predicted',
    },
    { icon: MapPin, label: 'Last Location', value: trip.last_location_name || 'Awaiting update' },
    { icon: Clock, label: 'Last Update', value: timeAgo(trip.last_update_at) },
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
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getLocationHealth(trip.last_update_at).className}`}>
              {getLocationHealth(trip.last_update_at).label}
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
            typeof trip.last_latitude === 'number' && typeof trip.last_longitude === 'number'
              ? { lat: trip.last_latitude, lng: trip.last_longitude }
              : null
          }
          zoom={10}
          className="h-64"
        />

        {/* Progress */}
        <div className="card-elevated p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{trip.origin}</span>
            <span>{trip.destination}</span>
          </div>
          <Progress value={routeProgress?.progressPercent ?? 0} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {routeProgress
              ? `${routeProgress.progressPercent}% route progress`
              : 'Route progress unavailable'}
          </p>
          {routeProgress && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              <p>Total distance: {formatKm(routeProgress.totalDistanceMeters)}</p>
              <p>Remaining: {formatKm(routeProgress.remainingDistanceMeters)}</p>
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
          Auto-refreshes every 5 seconds{lastPolledAt ? ` • Last sync ${format(new Date(lastPolledAt), 'HH:mm:ss')}` : ''}
        </p>
      </div>
    </div>
  );
}
