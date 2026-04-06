-- Add ETA automation fields to trips table
-- These support automatic server-driven ETA calculation with staleness detection

alter table public.trips
  add column if not exists predicted_eta_at          timestamp with time zone,
  add column if not exists predicted_eta_minutes     integer,
  add column if not exists remaining_distance_meters integer,
  add column if not exists eta_last_calculated_at    timestamp with time zone,
  add column if not exists last_location_received_at timestamp with time zone,
  add column if not exists is_location_live          boolean not null default false;

-- Index to efficiently query ETA-eligible trips (active + live location)
create index if not exists idx_trips_eta_eligible
  on public.trips (status, is_location_live, last_location_received_at)
  where is_active = true;
