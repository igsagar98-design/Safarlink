-- 20260408110000_enable_realtime_for_trips.sql
-- Enables Supabase Realtime for the trips table to allow the webapp to receive instant updates.

begin;
  -- Safely add the table to the replication publication if it is not already there
  do $$
  begin
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
      and schemaname = 'public' 
      and tablename = 'trips'
    ) then
      alter publication supabase_realtime add table public.trips;
    end if;
  end $$;
commit;

-- Confirming replication is set to 'FULL' to ensure all column changes (including ETAs) are sent.
ALTER TABLE public.trips REPLICA IDENTITY FULL;
