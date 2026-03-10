-- Sync trips.status from trip_status_updates inserts so anon driver link flows work with RLS.
create or replace function public.sync_trip_status_from_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trips
  set
    status = new.status,
    is_active = case when new.status = 'delivered' then false else is_active end,
    updated_at = now()
  where id = new.trip_id;

  return new;
end;
$$;

drop trigger if exists sync_trip_status_from_update
on public.trip_status_updates;

create trigger sync_trip_status_from_update
after insert on public.trip_status_updates
for each row execute function public.sync_trip_status_from_update();
