create table if not exists public.trip_stops (
  id uuid not null default gen_random_uuid() primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_order integer not null,
  stop_type text not null check (stop_type in ('pickup', 'delivery')),
  location_name text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint trip_stops_trip_id_stop_order_key unique (trip_id, stop_order)
);

create index if not exists idx_trip_stops_trip_id_stop_order
  on public.trip_stops (trip_id, stop_order asc);

alter table public.trip_stops enable row level security;

drop policy if exists "Users can view stops for own trips" on public.trip_stops;
create policy "Users can view stops for own trips"
  on public.trip_stops for select to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_stops.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert stops for own trips" on public.trip_stops;
create policy "Users can insert stops for own trips"
  on public.trip_stops for insert to authenticated
  with check (
    exists (
      select 1
      from public.trips t
      where t.id = trip_stops.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update stops for own trips" on public.trip_stops;
create policy "Users can update stops for own trips"
  on public.trip_stops for update to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_stops.trip_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.trips t
      where t.id = trip_stops.trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete stops for own trips" on public.trip_stops;
create policy "Users can delete stops for own trips"
  on public.trip_stops for delete to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_stops.trip_id
        and t.user_id = auth.uid()
    )
  );

drop trigger if exists update_trip_stops_updated_at on public.trip_stops;
create trigger update_trip_stops_updated_at
  before update on public.trip_stops
  for each row execute function public.update_updated_at_column();