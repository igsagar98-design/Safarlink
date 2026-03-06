
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trip status enum
CREATE TYPE public.trip_status AS ENUM ('on_time', 'at_risk', 'late', 'delivered');

-- Trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  transporter_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  material TEXT NOT NULL,
  planned_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
  current_eta TIMESTAMP WITH TIME ZONE,
  last_location_name TEXT,
  last_latitude DOUBLE PRECISION,
  last_longitude DOUBLE PRECISION,
  last_update_at TIMESTAMP WITH TIME ZONE,
  status public.trip_status NOT NULL DEFAULT 'on_time',
  tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_tracking_token UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_trips_tracking_token ON public.trips(tracking_token);
CREATE UNIQUE INDEX idx_trips_customer_token ON public.trips(customer_tracking_token);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_status ON public.trips(status);

-- Location updates table
CREATE TABLE public.trip_location_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_updates_trip ON public.trip_location_updates(trip_id);

-- Status updates table
CREATE TABLE public.trip_status_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  status public.trip_status NOT NULL,
  note TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_updates_trip ON public.trip_status_updates(trip_id);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_status_updates ENABLE ROW LEVEL SECURITY;

-- Trips RLS: authenticated users see their own trips
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create trips"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public access by tracking token (for driver and customer pages)
CREATE POLICY "Anyone can view trip by tracking token"
  ON public.trips FOR SELECT TO anon
  USING (true);

-- Location updates: driver (anon) can insert, owner can read
CREATE POLICY "Anyone can insert location updates"
  ON public.trip_location_updates FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert location updates"
  ON public.trip_location_updates FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view location updates"
  ON public.trip_location_updates FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view location updates"
  ON public.trip_location_updates FOR SELECT TO authenticated
  USING (true);

-- Status updates: driver (anon) can insert, anyone can read
CREATE POLICY "Anyone can insert status updates"
  ON public.trip_status_updates FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert status updates"
  ON public.trip_status_updates FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view status updates"
  ON public.trip_status_updates FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can view status updates"
  ON public.trip_status_updates FOR SELECT TO authenticated
  USING (true);

-- Triggers
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
