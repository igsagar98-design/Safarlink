-- Company portal MVP foundation: roles, companies, memberships, and trip company mapping.

create table if not exists public.profiles (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('transporter', 'company')),
  display_name text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.companies (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.company_users (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamp with time zone not null default now(),
  unique (user_id, company_id)
);

alter table public.trips
  add column if not exists company_id uuid references public.companies(id);

create index if not exists idx_trips_company_id on public.trips(company_id);
create index if not exists idx_company_users_user_id on public.company_users(user_id);
create index if not exists idx_company_users_company_id on public.company_users(company_id);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_users enable row level security;

-- Profiles policies.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id);

-- Companies policies.
drop policy if exists "Transporters can view companies" on public.companies;
create policy "Transporters can view companies"
  on public.companies for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.account_type = 'transporter'
    )
    or exists (
      select 1
      from public.company_users cu
      where cu.company_id = companies.id
        and cu.user_id = auth.uid()
    )
  );

-- Company users policies.
drop policy if exists "Users can view own company memberships" on public.company_users;
create policy "Users can view own company memberships"
  on public.company_users for select to authenticated
  using (user_id = auth.uid());

-- Trips policies update (authenticated select now supports company users).
drop policy if exists "Users can view their own trips" on public.trips;
create policy "Users can view their own trips"
  on public.trips for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.company_users cu
      where cu.company_id = trips.company_id
        and cu.user_id = auth.uid()
    )
  );

-- Keep transporter create/update/delete ownership.
drop policy if exists "Users can create trips" on public.trips;
create policy "Users can create trips"
  on public.trips for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own trips" on public.trips;
create policy "Users can update their own trips"
  on public.trips for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own trips" on public.trips;
create policy "Users can delete their own trips"
  on public.trips for delete to authenticated
  using (auth.uid() = user_id);

-- Updated_at trigger for companies.
drop trigger if exists update_companies_updated_at on public.companies;
create trigger update_companies_updated_at
  before update on public.companies
  for each row execute function public.update_updated_at_column();

-- Bootstrap profile + company mapping from auth metadata at signup.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text;
  v_display_name text;
  v_company_name text;
  v_company_id uuid;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'transporter');
  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', new.email);
  v_company_name := trim(coalesce(new.raw_user_meta_data->>'company_name', ''));

  insert into public.profiles (user_id, account_type, display_name)
  values (new.id, v_account_type, v_display_name)
  on conflict (user_id) do update
    set account_type = excluded.account_type,
        display_name = excluded.display_name;

  if v_account_type = 'company' and v_company_name <> '' then
    insert into public.companies (name)
    values (v_company_name)
    on conflict (name) do update set updated_at = now()
    returning id into v_company_id;

    if v_company_id is null then
      select id into v_company_id
      from public.companies
      where name = v_company_name
      limit 1;
    end if;

    if v_company_id is not null then
      insert into public.company_users (user_id, company_id, role)
      values (new.id, v_company_id, 'admin')
      on conflict (user_id, company_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
