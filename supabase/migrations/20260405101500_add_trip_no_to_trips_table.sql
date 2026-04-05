ALTER TABLE public.trips ADD COLUMN trip_no TEXT;

-- Index for faster searching by trip number
CREATE INDEX idx_trips_trip_no ON public.trips (trip_no);
