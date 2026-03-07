alter table public.trips
  add column if not exists predicted_arrival timestamp with time zone,
  add column if not exists delay_minutes integer;

create index if not exists idx_trips_predicted_arrival on public.trips(predicted_arrival);
