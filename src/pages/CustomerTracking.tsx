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

export default function CustomerTracking() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgressResult | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatKm = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

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
      } catch {
        setRouteProgress(null);
      }
    } catch {
      setError('Tracking link not found.');
      setTrip(null);
      setRouteProgress(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchTrip, 60000);
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
        </div>

        {typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0 && (
          <div className="card-elevated p-3 border-warning/40 bg-warning/10">
            <p className="text-xs font-medium text-warning">
              Delay warning: predicted arrival is {trip.delay_minutes} minutes later than planned.
            </p>
          </div>
        )}

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

        <p className="text-xs text-center text-muted-foreground">Auto-refreshes every 60 seconds</p>
      </div>
    </div>
  );
}
