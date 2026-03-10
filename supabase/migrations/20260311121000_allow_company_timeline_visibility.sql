-- Allow company users to read timeline events for trips assigned to their company.

drop policy if exists "Users can view trip events for own trips" on public.trip_events;
create policy "Users can view trip events for own trips"
  on public.trip_events for select to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_events.trip_id
        and (
          t.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.user_id = auth.uid()
              and p.role = 'company'
              and p.company_id = t.company_id
          )
        )
    )
  );
