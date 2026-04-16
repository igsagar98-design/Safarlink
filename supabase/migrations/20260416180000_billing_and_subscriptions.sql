-- Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type text NOT NULL CHECK (plan_type IN ('payg', 'starter', 'growth', 'scale')),
    trip_limit integer NOT NULL DEFAULT 0,
    price integer NOT NULL DEFAULT 0,
    start_date timestamp with time zone NOT NULL DEFAULT now(),
    end_date timestamp with time zone,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month text NOT NULL, -- Format: YYYY-MM
    trips_used integer NOT NULL DEFAULT 0,
    extra_trips integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT usage_tracking_pkey PRIMARY KEY (id),
    CONSTRAINT usage_tracking_user_month_key UNIQUE (user_id, month)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    payment_id text,
    order_id text,
    plan_type text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- RLS Policies

-- Subscriptions RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" 
    ON public.subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Usage Tracking RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" 
    ON public.usage_tracking FOR SELECT 
    USING (auth.uid() = user_id);

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" 
    ON public.payments FOR SELECT 
    USING (auth.uid() = user_id);


-- Trigger Function: Increment Trip Usage when Trip is Delivered
CREATE OR REPLACE FUNCTION public.increment_trip_usage_on_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month text;
    v_user_id uuid;
    v_limit integer;
    v_total_used integer;
    v_extra integer;
BEGIN
    -- Only trigger if status changed TO 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status <> 'delivered') THEN
        
        current_month := to_char(now(), 'YYYY-MM');
        v_user_id := NEW.user_id;

        -- Ensure a row exists for this month, or create one
        INSERT INTO public.usage_tracking (user_id, month, trips_used, extra_trips)
        VALUES (v_user_id, current_month, 0, 0)
        ON CONFLICT (user_id, month) DO NOTHING;

        -- Get current usage to calculate if this is an extra trip
        -- First we get the active plan info
        SELECT trip_limit INTO v_limit
        FROM public.subscriptions
        WHERE user_id = v_user_id AND status = 'active'
        LIMIT 1;

        -- Default to PAYG behavior if no active subscription limit found (0 limit means infinite limit? No, 0 usually means Pay As You Go, let's treat 0 as infinite but wait, prompt says: "trip_limit: 0 for unlimited". If so, PAYG has no limit but billed per trip)
        -- Actually prompt: Plan 1 (PAYG) -> trips included: 0, Plan 4 (Scale) -> unlimited trips. Let's say Scale limit is -1 for unlimited.
        -- Let's define Scale as -1 limit. If limit is 0 (PAYG), every trip is extra.
        IF v_limit IS NULL THEN
            v_limit := 0; -- default to 0 included trips
        END IF;

        -- Increment trips used
        UPDATE public.usage_tracking
        SET trips_used = trips_used + 1,
            updated_at = now()
        WHERE user_id = v_user_id AND month = current_month
        RETURNING trips_used INTO v_total_used;

        -- Calculate extra trips: if v_limit is -1 (unlimited), extra is 0.
        IF v_limit = -1 THEN
            v_extra := 0;
        ELSIF v_total_used > v_limit THEN
            v_extra := v_total_used - v_limit;
            
            UPDATE public.usage_tracking
            SET extra_trips = v_extra
            WHERE user_id = v_user_id AND month = current_month;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

-- Attach Trigger to trips table
DROP TRIGGER IF EXISTS trigger_increment_trip_usage ON public.trips;
CREATE TRIGGER trigger_increment_trip_usage
    AFTER UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_trip_usage_on_delivered();

-- Provide a function to get or create PAYG subscription for a user automatically
CREATE OR REPLACE FUNCTION public.ensure_user_subscription(p_user_id uuid)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sub public.subscriptions;
BEGIN
    SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id LIMIT 1;
    
    IF NOT FOUND THEN
        INSERT INTO public.subscriptions (user_id, plan_type, trip_limit, price, status)
        VALUES (p_user_id, 'payg', 0, 7, 'active')
        ON CONFLICT (user_id) DO NOTHING;
        
        SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id LIMIT 1;
    END IF;
    
    RETURN v_sub;
END;
$$;
