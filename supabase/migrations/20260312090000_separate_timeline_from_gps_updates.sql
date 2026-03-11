-- Separate user-visible timeline from silent GPS/state updates.
-- GPS pings should update trip location fields only and must not create timeline spam.

-- Stop logging an event for every trip_location_updates insert.
drop trigger if exists log_location_update_event on public.trip_location_updates;

-- Stop generic status timeline logging from trip_status_updates; milestone events are now explicit.
drop trigger if exists log_status_change_event on public.trip_status_updates;
