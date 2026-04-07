-- 20260408100000_unified_logistics_v2_final.sql

-- 1. Idempotent Column Additions
ALTER TABLE public.trips 
  ADD COLUMN IF NOT EXISTS pickup_latitude          double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude         double precision,
  ADD COLUMN IF NOT EXISTS drop_latitude            double precision,
  ADD COLUMN IF NOT EXISTS drop_longitude           double precision,
  ADD COLUMN IF NOT EXISTS route_distance_meters    integer,
  ADD COLUMN IF NOT EXISTS route_duration_seconds   integer,
  ADD COLUMN IF NOT EXISTS route_polyline           text,
  ADD COLUMN IF NOT EXISTS last_driver_latitude     double precision,
  ADD COLUMN IF NOT EXISTS last_driver_longitude    double precision,
  ADD COLUMN IF NOT EXISTS last_driver_location_at  timestamp with time zone,
  ADD COLUMN IF NOT EXISTS remaining_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS remaining_distance_meters integer,
  ADD COLUMN IF NOT EXISTS predicted_eta_at          timestamp with time zone,
  ADD COLUMN IF NOT EXISTS route_progress_percent   numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live_tracking         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_eta_calculated_at   timestamp with time zone;

-- 2. Safe Data Migration Block
DO $$ 
DECLARE 
    update_clause text := 'SET ';
    where_clause text := ' WHERE last_driver_latitude IS NULL';
    has_legacy_cols boolean := false;
BEGIN
    -- Check for each legacy column and append to update statement if present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'is_location_live') THEN
        update_clause := update_clause || 'is_live_tracking = COALESCE(is_location_live, false), ';
        has_legacy_cols := true;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'last_latitude') THEN
        update_clause := update_clause || 'last_driver_latitude = last_latitude, ';
        has_legacy_cols := true;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'last_longitude') THEN
        update_clause := update_clause || 'last_driver_longitude = last_longitude, ';
        has_legacy_cols := true;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'last_update_at') THEN
        update_clause := update_clause || 'last_driver_location_at = last_update_at, ';
        has_legacy_cols := true;
    END IF;

    -- Only proceed if legacy columns were found
    IF has_legacy_cols THEN
        -- Deterministic removal of the final ", " suffix
        update_clause := left(update_clause, length(update_clause) - 2);

        -- Detect "Active State" predicate
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'is_active') THEN
            where_clause := where_clause || ' AND is_active = true';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'status') THEN
            -- Precise active states as verified in enum and risk-logic.ts:
            where_clause := where_clause || ' AND status IN (''on_time'', ''at_risk'', ''late'')';
        END IF;

        EXECUTE 'UPDATE public.trips ' || update_clause || where_clause;
    END IF;
END $$;

-- 3. Dynamic Index Creation
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'is_active') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_live_tracking ON public.trips(is_live_tracking) WHERE is_active = true';
    ELSE
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_live_tracking ON public.trips(is_live_tracking) WHERE status IN (''on_time'', ''at_risk'', ''late'')';
    END IF;
END $$;

-- 4. Native Index for calculation staleness checks
CREATE INDEX IF NOT EXISTS idx_trips_eta_calc ON public.trips(last_eta_calculated_at);

-- 5. Clarity Comments
COMMENT ON COLUMN public.trips.route_progress_percent IS 'Calculation: ((baseline_dist - remaining_dist) / baseline_dist) * 100';
COMMENT ON COLUMN public.trips.is_live_tracking IS 'Set to true when driver APK starts sending location.';
