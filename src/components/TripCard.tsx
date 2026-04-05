import { getStatusLabel, getStatusClass, timeAgo, calculateTripStatus } from '@/lib/risk-logic';
import { MapPin, Clock, Truck, Package } from 'lucide-react';
import { format } from 'date-fns';
import type { Trip } from '@/lib/api';

interface Props {
  trip: Trip;
  onSelect: (trip: Trip) => void;
}

export default function TripCard({ trip, onSelect }: Props) {
  const computedStatus = calculateTripStatus(trip);

  return (
    <button
      onClick={() => onSelect(trip)}
      className="card-elevated p-4 text-left w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-display font-semibold text-sm truncate">{trip.vehicle_number}</span>
          {trip.trip_no && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono truncate max-w-[80px]">
              {trip.trip_no}
            </span>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getStatusClass(computedStatus)}`}>
          {getStatusLabel(computedStatus)}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          <span className="truncate">{trip.material}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{trip.origin} → {trip.destination}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>ETA: {trip.current_eta ? format(new Date(trip.current_eta), 'dd MMM, HH:mm') : format(new Date(trip.planned_arrival), 'dd MMM, HH:mm')}</span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{trip.last_location_name || 'No location yet'}</span>
        <span className="text-muted-foreground">{timeAgo(trip.last_update_at)}</span>
      </div>
    </button>
  );
}

export type { Trip };
