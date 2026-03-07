-- WARNING: destructive reset migration for testing.
-- This will remove all application data and all auth users.

begin;

-- Clear domain data first.
truncate table public.trip_events restart identity cascade;
truncate table public.trip_location_updates restart identity cascade;
truncate table public.trip_status_updates restart identity cascade;
truncate table public.trips restart identity cascade;
truncate table public.company_users restart identity cascade;
truncate table public.profiles restart identity cascade;
truncate table public.companies restart identity cascade;

-- Remove all Supabase Auth users.
delete from auth.users;

commit;
