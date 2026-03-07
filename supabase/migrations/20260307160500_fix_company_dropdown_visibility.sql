-- Ensure authenticated users can fetch companies for trip assignment dropdown.

drop policy if exists "Transporters can view companies" on public.companies;
create policy "Authenticated users can view companies"
  on public.companies for select to authenticated
  using (true);
