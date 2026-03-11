import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDriverTripByToken,
  getRouteProgress,
  markTripArrived,
  markTripDelivered,
  postTripEvent,
  postDriverLocationUpdate,
  postDriverStatusUpdate,
  type RouteProgressResult,
  type Trip,
  type TripStatus,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import TrackingMap from '@/components/TrackingMap';
import AppLogo, { AppLogoFallback } from '@/components/AppLogo';
import { toast } from 'sonner';
import { MapPin, Navigation, Package, Clock, AlertTriangle, XCircle, CheckCircle, Truck } from 'lucide-react';
import { format } from 'date-fns';

type DriverStatus = Exclude<TripStatus, 'delivered'>;

const LOCATION_PUSH_INTERVAL_MS = 10 * 1000;
const TRACKING_REFRESH_INTERVAL_MS = 15 * 1000;
type PermissionStateLike = 'granted' | 'denied' | 'prompt' | 'unsupported';

export default function DriverTracking() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [lastLocationSentAt, setLastLocationSentAt] = useState<string | null>(null);
  const [locationSendFailed, setLocationSendFailed] = useState(false);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [geoPermissionState, setGeoPermissionState] = useState<PermissionStateLike>('unsupported');
  const [currentStatus, setCurrentStatus] = useState<DriverStatus>('on_time');
  const [routeProgress, setRouteProgress] = useState<RouteProgressResult | null>(null);
  const openedEventLoggedRef = useRef(false);
  const trackingStartedLoggedRef = useRef(false);
  const trackingPausedLoggedRef = useRef(false);
  const trackingStoppedLoggedRef = useRef(false);

  const formatKm = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

  const refreshRouteProgress = useCallback(async (nextTrip: Trip) => {
    try {
      const progress = await getRouteProgress({
        origin: nextTrip.origin,
        destination: nextTrip.destination,
        currentLatitude: nextTrip.last_latitude,
        currentLongitude: nextTrip.last_longitude,
      });
      setRouteProgress(progress);
    } catch (err: unknown) {
      console.error('Route progress failed with input:', {
        origin: nextTrip.origin,
        destination: nextTrip.destination,
        lat: nextTrip.last_latitude,
        lng: nextTrip.last_longitude,
      });
      console.error('Error details:', err instanceof Error ? err.message : String(err));
      setRouteProgress(null);
    }
  }, []);

  const fetchTrip = useCallback(async () => {
    if (!token) return;

    try {
      const data = await getDriverTripByToken(token);
      if (!data) {
        setError('Trip not found or invalid link.');
        return;
      }

      setTrip(data);
      setCurrentStatus(data.status === 'late' ? 'late' : data.status === 'at_risk' ? 'at_risk' : 'on_time');
      setError('');
      await refreshRouteProgress(data);

      if (!openedEventLoggedRef.current) {
        openedEventLoggedRef.current = true;
        postTripEvent(data.id, 'driver_opened_link', {
          note: 'Driver opened tracking link',
        }).catch(() => {
          // Non-blocking event logging for timeline.
        });
      }
    } catch {
      setError('Trip not found or invalid link.');
    } finally {
      setLoading(false);
    }
  }, [refreshRouteProgress, token]);

  // Fetch trip by tracking token
  useEffect(() => {
    fetchTrip();
    const refreshInterval = setInterval(fetchTrip, TRACKING_REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshInterval);
  }, [fetchTrip]);

  // Send location update
  const sendLocation = useCallback(async (lat: number, lng: number): Promise<boolean> => {
    if (!trip) return false;
    try {
      setIsSendingLocation(true);
      await postDriverLocationUpdate(trip.id, lat, lng, { trackingToken: trip.tracking_token });
      setLocationSendFailed(false);
      const sentAt = new Date().toISOString();
      setLastLocationSentAt(sentAt);
      const nextTrip = {
        ...trip,
        last_latitude: lat,
        last_longitude: lng,
        last_location_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        last_update_at: sentAt,
      };
      setTrip(nextTrip);
      await refreshRouteProgress(nextTrip);

      if (!trackingStartedLoggedRef.current) {
        trackingStartedLoggedRef.current = true;
        trackingPausedLoggedRef.current = false;
        postTripEvent(trip.id, 'tracking_started', {
          note: 'Driver started live GPS tracking',
        }).catch(() => {
          // Non-blocking milestone logging.
        });
        postTripEvent(trip.id, 'in_transit', {
          note: 'Trip is in transit',
        }).catch(() => {
          // Non-blocking milestone logging.
        });
      }

      return true;
    } catch {
      setLocationSendFailed(true);
      toast.error('Failed to send location update');
      return false;
    } finally {
      setIsSendingLocation(false);
    }
  }, [refreshRouteProgress, trip]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationGranted(true);
        setLocationDenied(false);
        void sendLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoPermissionState('denied');
          setLocationDenied(true);
          setLocationGranted(false);
          toast.error('Location permission denied');
          return;
        }

        setLocationSendFailed(true);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [sendLocation]);

  useEffect(() => {
    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      setGeoPermissionState('unsupported');
      return;
    }

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermission = (state: PermissionState) => {
      if (!mounted) return;

      setGeoPermissionState(state);

      if (state === 'granted') {
        setLocationDenied(false);
        setLocationGranted(true);
      } else if (state === 'denied') {
        setLocationDenied(true);
        setLocationGranted(false);

        if (trip && trackingStartedLoggedRef.current && !trackingStoppedLoggedRef.current) {
          trackingStoppedLoggedRef.current = true;
          postTripEvent(trip.id, 'tracking_stopped', {
            note: 'Tracking stopped: location permission denied',
          }).catch(() => {
            // Non-blocking milestone logging.
          });
        }
      }
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        permissionStatus = status;
        syncPermission(status.state);
        status.onchange = () => syncPermission(status.state);
      })
      .catch(() => {
        setGeoPermissionState('unsupported');
      });

    return () => {
      mounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [trip]);

  useEffect(() => {
    if (!trip) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && trackingStartedLoggedRef.current && !trackingPausedLoggedRef.current) {
        trackingPausedLoggedRef.current = true;
        postTripEvent(trip.id, 'tracking_paused', {
          note: 'Tracking paused: app moved to background',
        }).catch(() => {
          // Non-blocking milestone logging.
        });
        return;
      }

      if (document.visibilityState === 'visible' && trackingPausedLoggedRef.current) {
        trackingPausedLoggedRef.current = false;
        postTripEvent(trip.id, 'tracking_started', {
          note: 'Tracking resumed: app active again',
        }).catch(() => {
          // Non-blocking milestone logging.
        });
      }
    };

    const onPageHide = () => {
      if (!trackingStartedLoggedRef.current || trackingStoppedLoggedRef.current) return;
      trackingStoppedLoggedRef.current = true;
      postTripEvent(trip.id, 'tracking_stopped', {
        note: 'Tracking stopped: driver page closed',
      }).catch(() => {
        // Non-blocking milestone logging.
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [trip]);

  useEffect(() => {
    if (!trip || !locationGranted || locationDenied || trip.status === 'delivered') {
      return;
    }

    requestCurrentLocation();
    const interval = setInterval(requestCurrentLocation, LOCATION_PUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [locationDenied, locationGranted, requestCurrentLocation, trip]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setLocationDenied(false);
    requestCurrentLocation();
  };

  // Update driver status
  const updateStatus = async (status: DriverStatus) => {
    if (!trip) return;
    try {
      setCurrentStatus(status);
      await postDriverStatusUpdate(trip.id, status);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleArrived = async () => {
    if (!trip) return;
    try {
      await postTripEvent(trip.id, 'reached_destination', {
        note: 'Driver reached destination',
      });
      await markTripArrived(trip.id);
      toast.success('Arrival recorded');
    } catch {
      toast.error('Failed to record arrival');
    }
  };

  const handleReachedPickup = async () => {
    if (!trip) return;
    try {
      await postTripEvent(trip.id, 'reached_pickup', {
        note: 'Driver reached pickup location',
      });
      toast.success('Pickup milestone recorded');
    } catch {
      toast.error('Failed to record pickup milestone');
    }
  };

  const handleDelivered = async () => {
    if (!trip) return;
    try {
      await markTripDelivered(trip.id);
      if (!trackingStoppedLoggedRef.current) {
        trackingStoppedLoggedRef.current = true;
        await postTripEvent(trip.id, 'tracking_stopped', {
          note: 'Tracking stopped after delivery',
        });
      }
      setTrip({ ...trip, status: 'delivered', is_active: false });
      toast.success('Trip marked as delivered');
    } catch {
      toast.error('Failed to mark delivered');
    }
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
          <div className="flex justify-center mb-2">
            <AppLogo className="h-12 w-auto" alt="Safarlink" />
            <AppLogoFallback label="Safarlink" />
          </div>
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

        {/* Route progress */}
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
          zoom={11}
          className="h-64"
        />

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
              Please allow location access for this site in browser settings, then tap Share My Location.
            </p>
          </div>
        )}

        {locationGranted && lastLocationSentAt && (
          <div className="card-elevated p-4 text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-1" />
            <p className="text-sm font-medium">Location sharing active</p>
            <p className="text-xs text-muted-foreground">Updates sent every 10 seconds</p>
            <p className="text-[11px] text-muted-foreground mt-1">Last sent: {format(new Date(lastLocationSentAt), 'dd MMM, HH:mm:ss')}</p>
          </div>
        )}

        <div className="card-elevated p-3 border-warning/30 bg-warning/10">
          <p className="text-xs text-warning font-medium">
            Keep this page open and screen active for continuous live tracking.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Browser-based tracking is not reliable in background mode; tracking will degrade gracefully to paused/stale.
          </p>
        </div>

        {locationGranted && !lastLocationSentAt && !locationDenied && (
          <div className="card-elevated p-4 text-center">
            <Navigation className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-sm font-medium">Location permission granted</p>
            <p className="text-xs text-muted-foreground">Waiting to send first GPS update...</p>
          </div>
        )}

        {locationSendFailed && !locationDenied && (
          <div className="card-elevated p-4 text-center border-destructive">
            <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-sm font-medium">GPS update failed</p>
            <p className="text-xs text-muted-foreground">Check network or GPS permissions. Automatic retry continues every 10 seconds.</p>
          </div>
        )}

        {isSendingLocation && (
          <p className="text-[11px] text-center text-muted-foreground">Sending latest location...</p>
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
              disabled={trip.status === 'delivered'}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> On Route
            </Button>
            <Button
              variant={currentStatus === 'at_risk' ? 'default' : 'outline'}
              size="sm"
              className={currentStatus === 'at_risk' ? 'status-badge-at-risk border-0' : ''}
              onClick={() => updateStatus('at_risk')}
              disabled={trip.status === 'delivered'}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Delay Risk
            </Button>
            <Button
              variant={currentStatus === 'late' ? 'default' : 'outline'}
              size="sm"
              className={currentStatus === 'late' ? 'status-badge-late border-0' : ''}
              onClick={() => updateStatus('late')}
              disabled={trip.status === 'delivered'}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Major Delay
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Trip Actions</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={handleReachedPickup} disabled={trip.status === 'delivered'}>
              Reached Pickup
            </Button>
            <Button variant="outline" size="sm" onClick={handleArrived} disabled={trip.status === 'delivered'}>
              Arrived at Destination
            </Button>
            <Button size="sm" onClick={handleDelivered} disabled={trip.status === 'delivered'}>
              Delivered
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
