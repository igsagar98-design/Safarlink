-- Enable required extension
create extension if not exists pgcrypto;

-- Create updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Create enum only if missing
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'trip_status'
      and n.nspname = 'public'
  ) then
    create type public.trip_status as enum ('on_time', 'at_risk', 'late', 'delivered');
  end if;
end $$;

-- Trips table
create table if not exists public.trips (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_number text not null,
  driver_name text not null,
  driver_phone text not null,
  transporter_name text not null,
  customer_name text not null,
  origin text not null,
  destination text not null,
  material text not null,
  planned_arrival timestamp with time zone not null,
  current_eta timestamp with time zone,
  last_location_name text,
  last_latitude double precision,
  last_longitude double precision,
  last_update_at timestamp with time zone,
  status public.trip_status not null default 'on_time',
  tracking_token uuid not null default gen_random_uuid(),
  customer_tracking_token uuid not null default gen_random_uuid(),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists idx_trips_tracking_token on public.trips(tracking_token);
create unique index if not exists idx_trips_customer_token on public.trips(customer_tracking_token);
create index if not exists idx_trips_user_id on public.trips(user_id);
create index if not exists idx_trips_status on public.trips(status);

-- Location updates table
create table if not exists public.trip_location_updates (
  id uuid not null default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  recorded_at timestamp with time zone not null default now()
);

create index if not exists idx_location_updates_trip on public.trip_location_updates(trip_id);

-- Status updates table
create table if not exists public.trip_status_updates (
  id uuid not null default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  status public.trip_status not null,
  note text,
  recorded_at timestamp with time zone not null default now()
);

create index if not exists idx_status_updates_trip on public.trip_status_updates(trip_id);

-- Enable RLS
alter table public.trips enable row level security;
alter table public.trip_location_updates enable row level security;
alter table public.trip_status_updates enable row level security;

-- Policies
drop policy if exists "Users can view their own trips" on public.trips;
create policy "Users can view their own trips"
  on public.trips for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create trips" on public.trips;
create policy "Users can create trips"
  on public.trips for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own trips" on public.trips;
create policy "Users can update their own trips"
  on public.trips for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own trips" on public.trips;
create policy "Users can delete their own trips"
  on public.trips for delete to authenticated
  using (auth.uid() = user_id);

-- Keep your current MVP public access model for now
drop policy if exists "Anyone can view trip by tracking token" on public.trips;
create policy "Anyone can view trip by tracking token"
  on public.trips for select to anon
  using (true);

drop policy if exists "Anyone can insert location updates" on public.trip_location_updates;
create policy "Anyone can insert location updates"
  on public.trip_location_updates for insert to anon
  with check (true);

drop policy if exists "Authenticated can insert location updates" on public.trip_location_updates;
create policy "Authenticated can insert location updates"
  on public.trip_location_updates for insert to authenticated
  with check (true);

drop policy if exists "Anyone can view location updates" on public.trip_location_updates;
create policy "Anyone can view location updates"
  on public.trip_location_updates for select to anon
  using (true);

drop policy if exists "Authenticated can view location updates" on public.trip_location_updates;
create policy "Authenticated can view location updates"
  on public.trip_location_updates for select to authenticated
  using (true);

drop policy if exists "Anyone can insert status updates" on public.trip_status_updates;
create policy "Anyone can insert status updates"
  on public.trip_status_updates for insert to anon
  with check (true);

drop policy if exists "Authenticated can insert status updates" on public.trip_status_updates;
create policy "Authenticated can insert status updates"
  on public.trip_status_updates for insert to authenticated
  with check (true);

drop policy if exists "Anyone can view status updates" on public.trip_status_updates;
create policy "Anyone can view status updates"
  on public.trip_status_updates for select to anon
  using (true);

drop policy if exists "Authenticated can view status updates" on public.trip_status_updates;
create policy "Authenticated can view status updates"
  on public.trip_status_updates for select to authenticated
  using (true);

-- Trigger
drop trigger if exists update_trips_updated_at on public.trips;
create trigger update_trips_updated_at
  before update on public.trips
  for each row execute function public.update_updated_at_column();
