import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, Navigation, Package, Clock, AlertTriangle, XCircle, CheckCircle, Truck } from 'lucide-react';
import { format } from 'date-fns';

type DriverStatus = 'on_time' | 'at_risk' | 'late';

export default function DriverTracking() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DriverStatus>('on_time');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch trip by tracking token
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('trips')
        .select('*')
        .eq('tracking_token', token)
        .maybeSingle();
      if (err || !data) {
        setError('Trip not found or invalid link.');
      } else {
        setTrip(data);
        setCurrentStatus(data.status === 'late' ? 'late' : data.status === 'at_risk' ? 'at_risk' : 'on_time');
      }
      setLoading(false);
    })();
  }, [token]);

  // Send location update
  const sendLocation = useCallback(async (lat: number, lng: number) => {
    if (!trip) return;
    // Insert location update
    await supabase.from('trip_location_updates').insert({
      trip_id: trip.id,
      latitude: lat,
      longitude: lng,
      location_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
    // Update trip's last location
    await supabase.from('trips').update({
      last_latitude: lat,
      last_longitude: lng,
      last_location_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      last_update_at: new Date().toISOString(),
    }).eq('id', trip.id);
  }, [trip]);

  // Request location and start periodic updates
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationGranted(true);
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        // Periodic updates every 3 minutes
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => sendLocation(p.coords.latitude, p.coords.longitude),
            () => {}
          );
        }, 3 * 60 * 1000);
      },
      () => {
        setLocationDenied(true);
        toast.error('Location permission denied');
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update driver status
  const updateStatus = async (status: DriverStatus) => {
    if (!trip) return;
    setCurrentStatus(status);
    await supabase.from('trip_status_updates').insert({
      trip_id: trip.id,
      status,
      note: `Driver reported: ${status}`,
    });
    await supabase.from('trips').update({ status }).eq('id', trip.id);
    toast.success('Status updated');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-2" />
          <p className="text-foreground font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary mb-2">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-lg">TrackFlow Lite</h1>
          <p className="text-xs text-muted-foreground">Driver Tracking</p>
        </div>

        {/* Trip info */}
        <div className="card-elevated p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">{trip.vehicle_number}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{trip.origin} → {trip.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="w-4 h-4" />
            <span>{trip.material}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Arrive by: {format(new Date(trip.planned_arrival), 'dd MMM, HH:mm')}</span>
          </div>
        </div>

        {/* Location permission */}
        {!locationGranted && !locationDenied && (
          <Button onClick={requestLocation} className="w-full" size="lg">
            <Navigation className="w-4 h-4 mr-2" /> Share My Location
          </Button>
        )}

        {locationDenied && (
          <div className="card-elevated p-4 text-center border-destructive">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium">Location permission denied</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please enable location in your browser settings and refresh this page.
            </p>
          </div>
        )}

        {locationGranted && (
          <div className="card-elevated p-4 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="text-sm font-medium">Location sharing active</p>
            <p className="text-xs text-muted-foreground">Updates sent every 3 minutes</p>
          </div>
        )}

        {/* Status buttons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Update Your Status</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={currentStatus === 'on_time' ? 'default' : 'outline'}
              size="sm"
              className={currentStatus === 'on_time' ? 'status-badge-on-time border-0' : ''}
              onClick={() => updateStatus('on_time')}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> On Route
            </Button>
            <Button
              variant={currentStatus === 'at_risk' ? 'default' : 'outline'}
              size="sm"
              className={currentStatus === 'at_risk' ? 'status-badge-at-risk border-0' : ''}
              onClick={() => updateStatus('at_risk')}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Delay Risk
            </Button>
            <Button
              variant={currentStatus === 'late' ? 'default' : 'outline'}
              size="sm"
              className={currentStatus === 'late' ? 'status-badge-late border-0' : ''}
              onClick={() => updateStatus('late')}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Major Delay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
