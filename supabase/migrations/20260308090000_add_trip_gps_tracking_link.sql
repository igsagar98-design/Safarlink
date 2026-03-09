-- Optional external GPS link provided by transporter (no driver link flow required)
alter table public.trips
add column if not exists gps_tracking_link text;
