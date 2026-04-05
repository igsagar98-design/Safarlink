alter table public.trips
  add column if not exists last_prediction_at timestamp with time zone;
