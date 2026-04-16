-- Migration: 20260416190000_free_trial_trigger.sql
-- Description: Automatically assigns a 7-day free trial to newly registered users

-- 1. Create the function that will provision the trial
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert a 7-day free trial subscription with a limit of 100 trips
  insert into public.subscriptions (
    user_id, 
    plan_type, 
    trip_limit, 
    price, 
    start_date, 
    end_date, 
    status, 
    updated_at
  )
  values (
    new.id, 
    'free_trial', 
    100,      -- 100 trips max
    0,        -- 0 price 
    now(), 
    now() + interval '7 days', -- 7 day expiry
    'active', 
    now()
  )
  on conflict (user_id) do nothing; -- don't override if somehow already exists

  return new;
end;
$$;

-- 2. Drop the trigger if it already exists (to prevent duplicates during reruns)
drop trigger if exists on_auth_user_created_billing on auth.users;

-- 3. Bind the trigger to auth.users insertions
create trigger on_auth_user_created_billing
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();
