import type { Trip } from '@/components/TripCard';
import { getStatusLabel, getStatusClass, calculateTripStatus, timeAgo } from '@/lib/risk-logic';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, X, MapPin, Phone, User, Building, Package, Clock, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  trip: Trip;
  onClose: () => void;
}

export default function TripDetail({ trip, onClose }: Props) {
  const status = calculateTripStatus(trip);
  const driverLink = `${window.location.origin}/driver/${trip.tracking_token}`;
  const customerLink = `${window.location.origin}/track/${trip.customer_tracking_token}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} link copied!`);
  };

  const whatsappLink = `https://wa.me/${trip.driver_name ? '' : ''}?text=${encodeURIComponent(
    `Hi ${trip.driver_name}, please open this link to share your live location for trip ${trip.vehicle_number}:\n${driverLink}`
  )}`;

  const rows = [
    { icon: User, label: 'Driver', value: trip.driver_name },
    { icon: Phone, label: 'Phone', value: trip.driver_phone || '—' },
    { icon: Building, label: 'Transporter', value: trip.transporter_name },
    { icon: Building, label: 'Customer', value: trip.customer_name },
    { icon: Package, label: 'Material', value: trip.material },
    { icon: MapPin, label: 'Origin', value: trip.origin },
    { icon: Navigation, label: 'Destination', value: trip.destination },
    { icon: Clock, label: 'Planned Arrival', value: format(new Date(trip.planned_arrival), 'dd MMM yyyy, HH:mm') },
    { icon: Clock, label: 'Current ETA', value: trip.current_eta ? format(new Date(trip.current_eta), 'dd MMM yyyy, HH:mm') : '—' },
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

      <div className="border-t pt-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Share Links</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copy(driverLink, 'Driver')}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Driver Link
            </Button>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> WhatsApp
              </Button>
            </a>
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => copy(customerLink, 'Customer')}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Customer Tracking Link
          </Button>
        </div>
      </div>
    </div>
  );
}
