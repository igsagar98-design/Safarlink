-- Identity upgrade: stable company IDs for transporter + shipper roles.

create table if not exists public.companies (
  id uuid not null default gen_random_uuid() primary key,
  name text,
  company_name text,
  company_code text,
  company_type text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.companies
  add column if not exists name text,
  add column if not exists company_name text,
  add column if not exists company_code text,
  add column if not exists company_type text;

-- Keep legacy `name` in sync so older code paths remain readable.
update public.companies
set company_name = coalesce(nullif(company_name, ''), nullif(name, ''))
where coalesce(company_name, '') = '';

update public.companies
set name = coalesce(nullif(name, ''), nullif(company_name, ''))
where coalesce(name, '') = '';

update public.companies
set company_type = coalesce(company_type, 'shipper')
where company_type is null;

alter table public.companies
  alter column company_name set not null;

alter table public.companies
  drop constraint if exists companies_company_type_check;

alter table public.companies
  add constraint companies_company_type_check
  check (company_type in ('transporter', 'shipper'));

create unique index if not exists idx_companies_company_code_unique
  on public.companies(company_code)
  where company_code is not null;

create unique index if not exists idx_companies_company_name_ci_unique
  on public.companies(lower(company_name));

create or replace function public.generate_company_code(p_company_id uuid)
returns text
language sql
immutable
as $$
  select 'CMP-' || upper(substr(replace(p_company_id::text, '-', ''), 1, 6));
$$;

create or replace function public.ensure_company_defaults()
returns trigger
language plpgsql
as $$
begin
  if coalesce(trim(new.company_name), '') = '' then
    new.company_name := coalesce(trim(new.name), '');
  end if;

  if coalesce(trim(new.name), '') = '' then
    new.name := new.company_name;
  end if;

  if new.company_type is null then
    new.company_type := 'shipper';
  end if;

  if coalesce(trim(new.company_code), '') = '' then
    if new.id is null then
      new.id := gen_random_uuid();
    end if;
    new.company_code := public.generate_company_code(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_company_defaults_trigger on public.companies;
create trigger ensure_company_defaults_trigger
before insert or update on public.companies
for each row execute function public.ensure_company_defaults();

update public.companies
set company_code = public.generate_company_code(id)
where coalesce(trim(company_code), '') = '';

alter table public.profiles
  add column if not exists id uuid,
  add column if not exists full_name text,
  add column if not exists role text,
  add column if not exists company_id uuid,
  add column if not exists phone text;

update public.profiles
set id = gen_random_uuid()
where id is null;

update public.profiles
set full_name = coalesce(nullif(full_name, ''), nullif(display_name, ''), 'User')
where coalesce(full_name, '') = '';

update public.profiles
set role = coalesce(nullif(role, ''), nullif(account_type, ''), 'transporter')
where coalesce(role, '') = '';

alter table public.profiles
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column full_name set not null,
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('transporter', 'company'));

alter table public.profiles
  drop constraint if exists profiles_company_id_fkey;

alter table public.profiles
  add constraint profiles_company_id_fkey
  foreign key (company_id)
  references public.companies(id)
  on delete set null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_pkey'
  ) then
    alter table public.profiles drop constraint profiles_pkey;
  end if;

  alter table public.profiles add constraint profiles_pkey primary key (id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_user_id_key;

alter table public.profiles
  add constraint profiles_user_id_key unique (user_id);

-- If existing company users exist, map company accounts to their first company.
update public.profiles p
set company_id = cu.company_id
from (
  select distinct on (user_id) user_id, company_id
  from public.company_users
  order by user_id, created_at asc
) cu
where p.user_id = cu.user_id
  and p.company_id is null;

alter table public.trips
  add column if not exists transporter_company_id uuid references public.companies(id);

create index if not exists idx_trips_transporter_company_id
  on public.trips(transporter_company_id);

-- Backfill transporter company from profile where possible.
update public.trips t
set transporter_company_id = p.company_id
from public.profiles p
where p.user_id = t.user_id
  and t.transporter_company_id is null
  and p.company_id is not null;

-- Backfill customer company link from customer_name when exact CI match exists.
update public.trips t
set company_id = c.id
from public.companies c
where t.company_id is null
  and lower(c.company_name) = lower(t.customer_name);

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
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Companies policies.
drop policy if exists "Transporters can view companies" on public.companies;
drop policy if exists "Authenticated users can view companies" on public.companies;
create policy "Authenticated users can view companies"
  on public.companies for select to authenticated
  using (true);

drop policy if exists "Authenticated users can insert companies" on public.companies;
create policy "Authenticated users can insert companies"
  on public.companies for insert to authenticated
  with check (true);

drop policy if exists "Users can update own company" on public.companies;
create policy "Users can update own company"
  on public.companies for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.company_id = companies.id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.company_id = companies.id
    )
  );

-- Company users policies.
drop policy if exists "Users can view own company memberships" on public.company_users;
create policy "Users can view own company memberships"
  on public.company_users for select to authenticated
  using (user_id = auth.uid());

-- Trips policies: transporter owns create/update/delete; company role can read shipments assigned to its company_id.
drop policy if exists "Users can view their own trips" on public.trips;
create policy "Users can view their own trips"
  on public.trips for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role = 'company'
        and p.company_id = trips.company_id
    )
  );

drop policy if exists "Users can create trips" on public.trips;
create policy "Users can create trips"
  on public.trips for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role = 'transporter'
        and p.company_id is not null
        and p.company_id = trips.transporter_company_id
    )
  );

drop policy if exists "Users can update their own trips" on public.trips;
create policy "Users can update their own trips"
  on public.trips for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  v_role text;
  v_full_name text;
  v_company_name text;
  v_company_type text;
  v_company_id uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', new.raw_user_meta_data->>'account_type', 'transporter');
  if v_role not in ('transporter', 'company') then
    v_role := 'transporter';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', new.email);
  v_company_name := trim(coalesce(new.raw_user_meta_data->>'company_name', ''));
  v_company_type := case when v_role = 'company' then 'shipper' else 'transporter' end;

  if v_company_name <> '' then
    select c.id into v_company_id
    from public.companies c
    where lower(c.company_name) = lower(v_company_name)
    limit 1;

    if v_company_id is null then
      insert into public.companies (company_name, name, company_type)
      values (v_company_name, v_company_name, v_company_type)
      returning id into v_company_id;
    end if;
  end if;

  insert into public.profiles (user_id, role, full_name, company_id, account_type, display_name)
  values (new.id, v_role, v_full_name, v_company_id, v_role, v_full_name)
  on conflict (user_id) do update
    set role = excluded.role,
        full_name = excluded.full_name,
        company_id = coalesce(excluded.company_id, profiles.company_id),
        account_type = excluded.account_type,
        display_name = excluded.display_name;

  if v_role = 'company' and v_company_id is not null then
    insert into public.company_users (user_id, company_id, role)
    values (new.id, v_company_id, 'admin')
    on conflict (user_id, company_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
