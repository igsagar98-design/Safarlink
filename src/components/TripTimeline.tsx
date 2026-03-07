import type { TripEvent } from '@/lib/api';
import { format } from 'date-fns';

interface Props {
  events: TripEvent[];
  compact?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  trip_created: 'Trip created',
  driver_opened_link: 'Driver opened tracking link',
  location_update: 'Location updated',
  status_change: 'Status changed',
  arrived: 'Arrived at destination',
  delivered: 'Delivered',
};

function toEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, ' ');
}

export default function TripTimeline({ events, compact = false }: Props) {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-2 text-sm">
          <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{toEventLabel(event.event_type)}</p>
            {event.note && <p className="text-xs text-muted-foreground truncate">{event.note}</p>}
            <p className="text-xs text-muted-foreground">
              {compact
                ? format(new Date(event.created_at), 'dd MMM, HH:mm')
                : format(new Date(event.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
