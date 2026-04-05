-- Migration to align trips table with driver app requirements
-- Adds progress tracking, source attribution, and expands status workflow

-- 1. Add missing columns
alter table public.trips 
add column if not exists progress integer default 0,
add column if not exists source_type text default 'internal';

-- 2. Expand trip_status enum to support granular tracking milestones
-- We use 'do' block or separate statements because 'add value' has restrictions in transactions
alter type public.trip_status add value if not exists 'validated';
alter type public.trip_status add value if not exists 'reached_pickup';
alter type public.trip_status add value if not exists 'on_route';
alter type public.trip_status add value if not exists 'arrived_destination';
alter type public.trip_status add value if not exists 'cancelled';

-- 3. Ensure RLS policies or triggers are still valid (they use 'user_id' which exists)
-- No changes needed to existing policies as they use user_id.

-- 4. Update the log_trip_created_event trigger to include new fields in metadata if desired
-- (Optional, keeping it simple for now)
