-- Trip events timeline table and workflow triggers.

create table if not exists public.trip_events (
  id uuid not null default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  event_type text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_trip_events_trip_id_created_at
  on public.trip_events (trip_id, created_at desc);

alter table public.trip_events enable row level security;

-- Authenticated users can view and create events for their own trips.
drop policy if exists "Users can view trip events for own trips" on public.trip_events;
create policy "Users can view trip events for own trips"
  on public.trip_events for select to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_events.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert trip events for own trips" on public.trip_events;
create policy "Users can insert trip events for own trips"
  on public.trip_events for insert to authenticated
  with check (
    exists (
      select 1
      from public.trips t
      where t.id = trip_events.trip_id
        and t.user_id = auth.uid()
    )
  );

-- MVP public tracking model: allow anon read/insert events.
drop policy if exists "Anyone can view trip events" on public.trip_events;
create policy "Anyone can view trip events"
  on public.trip_events for select to anon
  using (true);

drop policy if exists "Anyone can insert trip events" on public.trip_events;
create policy "Anyone can insert trip events"
  on public.trip_events for insert to anon
  with check (true);

-- Trigger: when a trip is created, create initial timeline event.
create or replace function public.log_trip_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_events (trip_id, event_type, note, metadata)
  values (
    new.id,
    'trip_created',
    'Trip created',
    jsonb_build_object(
      'vehicle_number', new.vehicle_number,
      'origin', new.origin,
      'destination', new.destination
    )
  );

  return new;
end;
$$;

drop trigger if exists log_trip_created_event on public.trips;
create trigger log_trip_created_event
after insert on public.trips
for each row execute function public.log_trip_created_event();

-- Trigger: location update entries produce timeline events.
create or replace function public.log_location_update_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_events (trip_id, event_type, note, metadata, created_at)
  values (
    new.trip_id,
    'location_update',
    coalesce(new.location_name, 'Location updated'),
    jsonb_build_object(
      'latitude', new.latitude,
      'longitude', new.longitude,
      'location_name', new.location_name
    ),
    new.recorded_at
  );

  return new;
end;
$$;

drop trigger if exists log_location_update_event on public.trip_location_updates;
create trigger log_location_update_event
after insert on public.trip_location_updates
for each row execute function public.log_location_update_event();

-- Trigger: status history entries produce timeline events.
create or replace function public.log_status_change_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_events (trip_id, event_type, note, metadata, created_at)
  values (
    new.trip_id,
    'status_change',
    coalesce(new.note, format('Status changed to %s', new.status::text)),
    jsonb_build_object('status', new.status::text),
    new.recorded_at
  );

  return new;
end;
$$;

drop trigger if exists log_status_change_event on public.trip_status_updates;
create trigger log_status_change_event
after insert on public.trip_status_updates
for each row execute function public.log_status_change_event();
