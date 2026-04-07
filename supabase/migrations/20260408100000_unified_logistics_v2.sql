-- Unified Logistics Schema Migration v2
-- This migration adds all fields required for backend-calculated ETA and route progress.

-- 1. Add all required columns to public.trips
ALTER TABLE public.trips 
  -- Precision coordinates for baseline
  ADD COLUMN IF NOT EXISTS pickup_latitude          double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude         double precision,
  ADD COLUMN IF NOT EXISTS drop_latitude            double precision,
  ADD COLUMN IF NOT EXISTS drop_longitude           double precision,

  -- Baseline route data (computed once at creation or backfill)
  ADD COLUMN IF NOT EXISTS route_distance_meters    integer,
  ADD COLUMN IF NOT EXISTS route_duration_seconds   integer,
  ADD COLUMN IF NOT EXISTS route_polyline           text,

  -- Live tracking metrics
  ADD COLUMN IF NOT EXISTS last_driver_latitude     double precision,
  ADD COLUMN IF NOT EXISTS last_driver_longitude    double precision,
  ADD COLUMN IF NOT EXISTS last_driver_location_at  timestamp with time zone,
  
  -- Computed backend values (Single source of truth)
  ADD COLUMN IF NOT EXISTS remaining_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS route_progress_percent   numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live_tracking         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_eta_calculated_at   timestamp with time zone;

-- 2. Ensure existing predicted fields exist (idempotent)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS predicted_eta_at          timestamp with time zone,
  ADD COLUMN IF NOT EXISTS remaining_distance_meters integer;

-- 3. Data Migration: Preserve old values safely
-- Use existing tracking info if present
UPDATE public.trips
SET 
  is_live_tracking = COALESCE(is_location_live, false),
  last_driver_latitude = last_latitude,
  last_driver_longitude = last_longitude,
  last_driver_location_at = last_update_at
WHERE is_active = true 
  AND last_driver_latitude IS NULL;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_live_tracking ON public.trips(is_live_tracking) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trips_eta_calc ON public.trips(last_eta_calculated_at);

-- 5. Comments for clarity
COMMENT ON COLUMN public.trips.route_progress_percent IS 'Calculation: ((baseline_dist - remaining_dist) / baseline_dist) * 100';
COMMENT ON COLUMN public.trips.is_live_tracking IS 'Set to true when driver APK starts sending location.';
