-- Allow authenticated users to create company records for MVP onboarding.

drop policy if exists "Authenticated users can insert companies" on public.companies;
create policy "Authenticated users can insert companies"
  on public.companies for insert to authenticated
  with check (true);
