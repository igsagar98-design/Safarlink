import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '@/components/TripCard';
import { deleteTrip, listTripEvents, type TripEvent, updateTrip } from '@/lib/api';
import { getStatusLabel, getStatusClass, calculateTripStatus, timeAgo } from '@/lib/risk-logic';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, X, MapPin, Phone, User, Building, Package, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import TripTimeline from '@/components/TripTimeline';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

    const fetchEvents = async () => {
      try {
        const data = await listTripEvents(trip.id);
        if (!active) return;
        setEvents(data);
      } catch {
        if (!active) return;
        setEvents([]);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [trip.id]);

  const driverWhatsappLink = useMemo(() => {
    const message = `Driver tracking link for vehicle ${trip.vehicle_number}: ${driverLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [driverLink, trip.vehicle_number]);

  const customerWhatsappLink = useMemo(() => {
    const message = `Customer tracking link for vehicle ${trip.vehicle_number}: ${customerLink}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [customerLink, trip.vehicle_number]);

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

  const handleSave = async () => {
    const gpsLink = form.gps_tracking_link.trim();
    if (gpsLink && !isValidHttpUrl(gpsLink)) {
      toast.error('GPS tracking link must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTrip(trip.id, {
        ...form,
        gps_tracking_link: gpsLink || null,
        planned_arrival: new Date(form.planned_arrival).toISOString(),
      });
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
    { icon: MapPin, label: 'Last Location', value: trip.last_location_name || 'No updates yet' },
    { icon: Clock, label: 'Last Update', value: timeAgo(trip.last_update_at) },
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
        <TripTimeline events={events} compact />
      </div>
    </div>
  );
}
