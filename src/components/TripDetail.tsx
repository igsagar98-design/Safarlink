import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '@/components/TripCard';
import { deleteTrip, listTripEvents, listTripStops, replaceTripStops, type TripEvent, type TripStopType, updateTrip, updateTripCreatedEventMetadata } from '@/lib/api';
import { getStatusLabel, getStatusClass, calculateTripStatus, timeAgo } from '@/lib/risk-logic';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, X, MapPin, Phone, User, Building, Package, Clock, Navigation, AlertTriangle, Route, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import TripTimeline from '@/components/TripTimeline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TrackingMap from '@/components/TrackingMap';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const TIMELINE_REFRESH_INTERVAL_MS = 15 * 1000;

interface Props {
  trip: Trip;
  onClose: () => void;
  onUpdated?: (trip: Trip) => void;
  onDeleted?: (tripId: string) => void;
  allowManagement?: boolean;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function toMapPoint(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null;
  return { lat: latitude, lng: longitude };
}

type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type AdditionalStop = {
  id: string;
  type: TripStopType;
  location: string;
  selectedLocation: SelectedLocation | null;
};

type TripCreatedEventMetadata = {
  additional_stops?: Array<{
    sequence?: number;
    type?: TripStopType;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
};

function getShareBaseUrl(): string {
  const envBase = (import.meta.env.VITE_SHARE_BASE_URL as string | undefined)?.trim();
  return normalizeBaseUrl(envBase || window.location.origin);
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function createStopId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `stop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapMetadataStops(events: TripEvent[]): AdditionalStop[] {
  const tripCreatedEvent = [...events].reverse().find((event) => event.event_type === 'trip_created');
  const metadata = (tripCreatedEvent?.metadata ?? {}) as TripCreatedEventMetadata;
  const additionalStops = Array.isArray(metadata.additional_stops) ? metadata.additional_stops : [];

  return additionalStops.map((stop) => ({
    id: createStopId(),
    type: stop.type === 'delivery' ? 'delivery' : 'pickup',
    location: stop.address ?? '',
    selectedLocation:
      typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
        ? { address: stop.address ?? '', lat: stop.latitude, lng: stop.longitude }
        : null,
  }));
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const tempTextarea = document.createElement('textarea');
  tempTextarea.value = text;
  tempTextarea.style.position = 'fixed';
  tempTextarea.style.left = '-9999px';
  document.body.appendChild(tempTextarea);
  tempTextarea.focus();
  tempTextarea.select();

  document.execCommand('copy');
  document.body.removeChild(tempTextarea);
}

export default function TripDetail({
  trip,
  onClose,
  onUpdated,
  onDeleted,
  allowManagement = true,
}: Props) {
  const status = calculateTripStatus(trip);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [additionalStops, setAdditionalStops] = useState<AdditionalStop[]>([]);
  const [form, setForm] = useState({
    vehicle_number: trip.vehicle_number,
    driver_name: trip.driver_name,
    driver_phone: trip.driver_phone,
    gps_tracking_link: trip.gps_tracking_link || '',
    transporter_name: trip.transporter_name,
    customer_name: trip.customer_name,
    origin: trip.origin,
    destination: trip.destination,
    material: trip.material,
    planned_arrival: format(new Date(trip.planned_arrival), "yyyy-MM-dd'T'HH:mm"),
  });
  const shareBaseUrl = getShareBaseUrl();
  const driverLink = `${shareBaseUrl}/driver/${trip.tracking_token}`;
  const customerLink = `${shareBaseUrl}/track/${trip.customer_tracking_token}`;

  useEffect(() => {
    setForm({
      vehicle_number: trip.vehicle_number,
      driver_name: trip.driver_name,
      driver_phone: trip.driver_phone,
      gps_tracking_link: trip.gps_tracking_link || '',
      transporter_name: trip.transporter_name,
      customer_name: trip.customer_name,
      origin: trip.origin,
      destination: trip.destination,
      material: trip.material,
      planned_arrival: format(new Date(trip.planned_arrival), "yyyy-MM-dd'T'HH:mm"),
    });
    setIsEditing(false);
  }, [trip]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [eventData, stopData] = await Promise.all([
          listTripEvents(trip.id),
          listTripStops(trip.id),
        ]);

        if (!active) return;
        setEventsUnavailable(false);
        setEvents(eventData);

        if (stopData.length > 0) {
          setAdditionalStops(stopData.map((stop) => ({
            id: stop.id,
            type: stop.stop_type,
            location: stop.location_name,
            selectedLocation:
              typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
                ? { address: stop.location_name, lat: stop.latitude, lng: stop.longitude }
                : null,
          })));
        } else {
          setAdditionalStops(mapMetadataStops(eventData));
        }
      } catch {
        if (!active) return;
        setEventsUnavailable(true);
        setEvents([]);
        setAdditionalStops([]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, TIMELINE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [trip.id, trip.last_update_at]);

  const driverWhatsappLink = useMemo(() => {
    const message = `Driver tracking link for vehicle ${trip.vehicle_number}: ${driverLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [driverLink, trip.vehicle_number]);

  const customerWhatsappLink = useMemo(() => {
    const message = `Customer tracking link for vehicle ${trip.vehicle_number}: ${customerLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [customerLink, trip.vehicle_number]);
  const pickupPoint = toMapPoint(trip.pickup_latitude, trip.pickup_longitude);
  const dropPoint = toMapPoint(trip.drop_latitude, trip.drop_longitude);
  const driverPoint = toMapPoint(trip.last_latitude, trip.last_longitude);
  const hasTrackingMap = Boolean(pickupPoint || dropPoint || driverPoint);

  const copy = async (text: string, label: string) => {
    try {
      await copyText(text);
      toast.success(`${label} link copied!`);

      if (/localhost|127\.0\.0\.1/i.test(shareBaseUrl)) {
        toast.info('This link uses localhost. For other devices, set VITE_SHARE_BASE_URL to your LAN/HTTPS domain.');
      }
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()} link`);
    }
  };

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddStop = () => {
    setAdditionalStops((current) => [
      ...current,
      {
        id: createStopId(),
        type: 'pickup',
        location: '',
        selectedLocation: null,
      },
    ]);
  };

  const handleRemoveStop = (stopId: string) => {
    setAdditionalStops((current) => current.filter((stop) => stop.id !== stopId));
  };

  const handleStopTypeChange = (stopId: string, type: TripStopType) => {
    setAdditionalStops((current) =>
      current.map((stop) => (stop.id === stopId ? { ...stop, type } : stop))
    );
  };

  const handleStopLocationChange = (stopId: string, location: string) => {
    setAdditionalStops((current) =>
      current.map((stop) => (
        stop.id === stopId
          ? { ...stop, location, selectedLocation: location.trim() ? stop.selectedLocation : null }
          : stop
      ))
    );
  };

  const handleStopLocationSelect = (stopId: string, selectedLocation: SelectedLocation | null) => {
    setAdditionalStops((current) =>
      current.map((stop) => (stop.id === stopId ? { ...stop, selectedLocation } : stop))
    );
  };

  const buildStopPayload = () => {
    const incompleteStop = additionalStops.find((stop) => !stop.location.trim());
    if (incompleteStop) {
      throw new Error('Every additional stop must include a location or be removed.');
    }

    return additionalStops.map((stop, index) => ({
      stop_order: index + 1,
      stop_type: stop.type,
      location_name: stop.location.trim(),
      latitude: stop.selectedLocation?.lat ?? null,
      longitude: stop.selectedLocation?.lng ?? null,
    }));
  };

  const handleSave = async () => {
    const gpsLink = form.gps_tracking_link.trim();
    if (gpsLink && !isValidHttpUrl(gpsLink)) {
      toast.error('GPS tracking link must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      const stopPayload = buildStopPayload();
      const updated = await updateTrip(trip.id, {
        ...form,
        gps_tracking_link: gpsLink || null,
        planned_arrival: new Date(form.planned_arrival).toISOString(),
      });

      const savedStops = await replaceTripStops(trip.id, stopPayload);

      if (savedStops.length === 0 && stopPayload.length > 0) {
        await updateTripCreatedEventMetadata(trip.id, {
          additional_stops: stopPayload.map((stop) => ({
            sequence: stop.stop_order,
            type: stop.stop_type,
            address: stop.location_name,
            latitude: stop.latitude,
            longitude: stop.longitude,
          })),
        });
      }

      onUpdated?.(updated);
      setIsEditing(false);
      toast.success('Shipment updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update shipment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm('Delete this shipment? This action cannot be undone.');
    if (!ok) return;

    setSaving(true);
    try {
      await deleteTrip(trip.id);
      onDeleted?.(trip.id);
      toast.success('Shipment deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete shipment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { icon: User, label: 'Driver', value: trip.driver_name },
    { icon: Phone, label: 'Phone', value: trip.driver_phone || '—' },
    { icon: ExternalLink, label: 'GPS Link', value: trip.gps_tracking_link || '—' },
    { icon: Building, label: 'Transporter', value: trip.transporter_name },
    { icon: Building, label: 'Customer', value: trip.customer_name },
    { icon: Package, label: 'Material', value: trip.material },
    { icon: MapPin, label: 'Origin', value: trip.origin },
    { icon: Navigation, label: 'Destination', value: trip.destination },
    { icon: Clock, label: 'Planned Arrival', value: format(new Date(trip.planned_arrival), 'dd MMM yyyy, HH:mm') },
    {
      icon: Clock,
      label: 'Predicted ETA',
      value: trip.predicted_arrival
        ? format(new Date(trip.predicted_arrival), 'dd MMM yyyy, HH:mm')
        : (trip.current_eta ? format(new Date(trip.current_eta), 'dd MMM yyyy, HH:mm') : '—'),
    },
    {
      icon: AlertTriangle,
      label: 'Delay',
      value:
        typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0
          ? `${trip.delay_minutes} min delayed`
          : 'No delay predicted',
    },
    {
      icon: MapPin,
      label: 'Last Location',
      value: driverPoint ? 'Live marker shown on map' : (trip.last_location_name || 'No updates yet'),
    },
    { icon: Clock, label: 'Last Update', value: timeAgo(trip.last_update_at) },
  ];

  const routeStops = [
    { id: 'origin', label: 'Pickup', value: trip.origin, type: 'pickup' as const, primary: true },
    ...additionalStops.map((stop) => ({
      id: stop.id,
      label: stop.type === 'pickup' ? 'Extra Pickup' : 'Extra Delivery',
      value: stop.location,
      type: stop.type,
      primary: false,
    })),
    { id: 'destination', label: 'Delivery', value: trip.destination, type: 'delivery' as const, primary: true },
  ];

  return (
    <div className="card-elevated p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg">{trip.vehicle_number}</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusClass(status)}`}>
            {getStatusLabel(status)}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2 text-sm">
            <r.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground w-28 shrink-0">{r.label}</span>
            <span className="font-medium truncate">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Route Stops</p>
        </div>
        <div className="space-y-2">
          {routeStops.map((stop, index) => (
            <div key={stop.id} className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${stop.type === 'pickup' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {index + 1}. {stop.label}{stop.primary ? ' (Primary)' : ''}
                </p>
                <p className="text-sm text-muted-foreground break-words">{stop.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Live Tracking</p>
        {hasTrackingMap ? (
          <TrackingMap
            pickup={pickupPoint}
            drop={dropPoint}
            driver={driverPoint}
            zoom={11}
            className="h-56"
          />
        ) : (
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-sm font-medium">Tracking map will appear once location data is available.</p>
            <p className="text-xs text-muted-foreground mt-1">The driver has not sent a usable GPS point yet.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <a href={customerLink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[180px]">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Live Tracking
            </Button>
          </a>
          {trip.gps_tracking_link && (
            <a href={trip.gps_tracking_link} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[180px]">
              <Button variant="outline" size="sm" className="w-full text-xs">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open GPS Provider
              </Button>
            </a>
          )}
        </div>
      </div>

      {allowManagement && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Shipment Actions</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setIsEditing((v) => !v)}>
              {isEditing ? 'Cancel Edit' : 'Edit Shipment'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleDelete} disabled={saving}>
              Delete Shipment
            </Button>
          </div>
        </div>
      )}

      {allowManagement && isEditing && (
        <div className="border-t pt-4 grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">Edit Current Shipment</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={form.vehicle_number} onChange={(e) => set('vehicle_number', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Driver Name</Label>
              <Input value={form.driver_name} onChange={(e) => set('driver_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Driver Phone</Label>
              <Input value={form.driver_phone || ''} onChange={(e) => set('driver_phone', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">GPS Tracking Link (Optional)</Label>
              <Input
                type="url"
                value={form.gps_tracking_link || ''}
                onChange={(e) => set('gps_tracking_link', e.target.value)}
                placeholder="https://gps.example.com/live/vehicle-123"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transporter</Label>
              <Input value={form.transporter_name} onChange={(e) => set('transporter_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material</Label>
              <Input value={form.material} onChange={(e) => set('material', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origin</Label>
              <Input value={form.origin} onChange={(e) => set('origin', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destination</Label>
              <Input value={form.destination} onChange={(e) => set('destination', e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Planned Arrival</Label>
              <Input
                type="datetime-local"
                value={form.planned_arrival}
                onChange={(e) => set('planned_arrival', e.target.value)}
              />
            </div>
            <div className="space-y-3 md:col-span-2 rounded-md border border-dashed p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Additional Stops</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Keep the main origin and destination above. Use these rows for optional intermediate stops.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStop}>
                  + Add Additional Stop
                </Button>
              </div>

              {additionalStops.length > 0 && (
                <div className="space-y-3">
                  {additionalStops.map((stop, index) => (
                    <div key={stop.id} className="rounded-md border bg-background p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium">Stop {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground"
                          onClick={() => handleRemoveStop(stop.id)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
                        <div className="space-y-1">
                          <Label className="text-xs">Stop Type</Label>
                          <Select
                            value={stop.type}
                            onValueChange={(value) => handleStopTypeChange(stop.id, value as TripStopType)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stop type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pickup">Pickup</SelectItem>
                              <SelectItem value="delivery">Delivery</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <LocationAutocomplete
                          id={`trip-detail-stop-${stop.id}`}
                          label="Stop Location"
                          placeholder={`Search ${stop.type} stop`}
                          value={stop.location}
                          required
                          onChange={(value) => handleStopLocationChange(stop.id, value)}
                          onSelect={(location) => handleStopLocationSelect(stop.id, location)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}

      {typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <p className="text-xs font-medium text-warning">
            Delay warning: predicted arrival is {trip.delay_minutes} minutes after planned arrival.
          </p>
        </div>
      )}

      {allowManagement && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Share Links</p>
          <div className="flex flex-col gap-2">
            {trip.gps_tracking_link && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copy(trip.gps_tracking_link, 'GPS')}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy GPS Link
                </Button>
                <a href={trip.gps_tracking_link} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open GPS
                  </Button>
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copy(driverLink, 'Driver')}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Driver Link
              </Button>
              <a href={driverWhatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> WhatsApp Driver
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copy(customerLink, 'Customer')}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Customer Link
              </Button>
              <a href={customerWhatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> WhatsApp Customer
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Trip Timeline</p>
        {eventsUnavailable ? (
          <p className="text-xs text-muted-foreground">Timeline unavailable for this account.</p>
        ) : (
          <TripTimeline events={events} compact />
        )}
      </div>
    </div>
  );
}
