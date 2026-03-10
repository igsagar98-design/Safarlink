-- Store selected pickup/drop coordinates from Google Places selections.
alter table public.trips
add column if not exists pickup_latitude double precision,
add column if not exists pickup_longitude double precision,
add column if not exists drop_latitude double precision,
add column if not exists drop_longitude double precision;
