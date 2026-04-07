-- 20260408110000_enable_realtime_for_trips.sql
-- Enables Supabase Realtime for the trips table to allow the webapp to receive instant updates.

begin;
  -- Remove the table from the publication if it exists (idempotent)
  alter publication supabase_realtime drop table if exists public.trips;
  
  -- Add the table to the publication
  alter publication supabase_realtime add table public.trips;
commit;

-- Confirming replication is set to 'FULL' to ensure all column changes (including ETAs) are sent.
ALTER TABLE public.trips REPLICA IDENTITY FULL;
