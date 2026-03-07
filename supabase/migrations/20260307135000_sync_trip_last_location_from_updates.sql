-- Keep trip summary fields in sync when driver location updates are inserted.
-- This is required for shared tracking links where inserts may run as anon.

create or replace function public.sync_trip_last_location_from_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trips
  set
    last_latitude = new.latitude,
    last_longitude = new.longitude,
    last_location_name = new.location_name,
    last_update_at = new.recorded_at,
    updated_at = now()
  where id = new.trip_id;

  return new;
end;
$$;

drop trigger if exists sync_trip_last_location_from_update
on public.trip_location_updates;

create trigger sync_trip_last_location_from_update
after insert on public.trip_location_updates
for each row execute function public.sync_trip_last_location_from_update();

-- Backfill stale trip summary fields from latest known location update.
update public.trips t
set
  last_latitude = latest.latitude,
  last_longitude = latest.longitude,
  last_location_name = latest.location_name,
  last_update_at = latest.recorded_at,
  updated_at = now()
from (
  select distinct on (trip_id)
    trip_id,
    latitude,
    longitude,
    location_name,
    recorded_at
  from public.trip_location_updates
  order by trip_id, recorded_at desc
) latest
where latest.trip_id = t.id
  and (
    t.last_update_at is null
    or t.last_update_at < latest.recorded_at
  );
