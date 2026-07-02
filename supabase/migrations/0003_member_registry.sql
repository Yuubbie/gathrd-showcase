-- ============================================================
-- GATHRD — Week 2 Migration
-- Module 1: Member Registry (+ QR self-onboarding)
-- Blueprint Section 4, Module 1
-- ============================================================

-- ------------------------------------------------------------
-- 0. Church-level additions: onboarding slug + medical data toggle
-- ------------------------------------------------------------
alter table public.churches
  add column onboarding_slug text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  add column medical_data_enabled boolean not null default false;

-- ------------------------------------------------------------
-- 1. departments
-- ------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  name text not null,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_departments_audit
before insert or update on public.departments
for each row execute function public.set_audit_fields();

-- ------------------------------------------------------------
-- 2. cell_groups
-- ------------------------------------------------------------
create table public.cell_groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  name text not null,
  leader_profile_id uuid references public.profiles(id),

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_cell_groups_audit
before insert or update on public.cell_groups
for each row execute function public.set_audit_fields();

-- Now that cell_groups exists, wire up the placeholder FK from Week 1
alter table public.profiles
  add constraint fk_profiles_cell_group foreign key (cell_group_id) references public.cell_groups(id);
alter table public.profiles
  add constraint fk_profiles_department foreign key (department_id) references public.departments(id);

-- ------------------------------------------------------------
-- 3. members — the registry itself
-- ------------------------------------------------------------
create type public.member_status as enum (
  'active', 'inactive', 'new_convert', 'worker', 'transferred_out', 'deceased'
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  profile_id uuid references public.profiles(id), -- nullable: most members never log in

  -- Required fields (Blueprint Section 4)
  full_name text not null,
  phone text,
  email text,
  date_of_birth date,
  gender text check (gender in ('male', 'female')),
  marital_status text,
  residential_address text,
  state_of_origin text,
  lga text,
  occupation text,
  cell_group_id uuid references public.cell_groups(id),
  status public.member_status not null default 'active',
  date_joined date not null default current_date,
  photo_url text,

  -- Optional fields
  wedding_anniversary date,
  blood_group text,       -- only ever populated if churches.medical_data_enabled = true
  genotype text,           -- same consent gate
  born_again_date date,
  next_of_kin_name text,
  next_of_kin_phone text,
  social_handles jsonb,

  -- Self-onboarding tracking
  source text not null default 'admin_added', -- 'admin_added' | 'self_onboarded' | 'csv_import'

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_members_audit
before insert or update on public.members
for each row execute function public.set_audit_fields();

-- member <-> department is many-to-many (a member can serve multiple departments)
create table public.member_departments (
  member_id uuid not null references public.members(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (member_id, department_id)
);

-- Indexes for the search/filter admin feature (Section 4: search by name,
-- department, cell group, status, LGA, state of origin)
create index idx_members_church on public.members(church_id);
create index idx_members_cell_group on public.members(cell_group_id);
create index idx_members_status on public.members(status);
create index idx_members_state_origin on public.members(state_of_origin);
create index idx_members_lga on public.members(lga);
create index idx_members_full_name on public.members using gin (to_tsvector('english', full_name));

-- ------------------------------------------------------------
-- 4. Self-onboarding RPC — the QR/link flow
--    Public (anonymous) users never get direct INSERT access to
--    `members`. Instead they call this function, which validates
--    the church's onboarding slug and inserts on their behalf.
--    This keeps every other church's data completely unreachable
--    even if someone inspects the frontend network calls.
-- ------------------------------------------------------------
create or replace function public.self_onboard_member(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_gender text,
  p_marital_status text,
  p_residential_address text,
  p_state_of_origin text,
  p_lga text,
  p_occupation text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_church_id uuid;
  v_member_id uuid;
begin
  select id into v_church_id
  from public.churches
  where onboarding_slug = p_slug
    and deleted_at is null;

  if v_church_id is null then
    raise exception 'Invalid onboarding link.';
  end if;

  insert into public.members (
    church_id, full_name, phone, email, date_of_birth, gender,
    marital_status, residential_address, state_of_origin, lga,
    occupation, status, source
  ) values (
    v_church_id, p_full_name, p_phone, p_email, p_date_of_birth, p_gender,
    p_marital_status, p_residential_address, p_state_of_origin, p_lga,
    p_occupation, 'active', 'self_onboarded'
  )
  returning id into v_member_id;

  -- Audit trail even for anonymous self-onboarding
  insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
  values (v_church_id, null, 'insert', 'members', v_member_id,
          jsonb_build_object('source', 'self_onboarded', 'full_name', p_full_name));

  return v_member_id;
end;
$$;

-- Anyone (including anonymous/public visitors) can call this function.
-- It's the ONLY write path available to unauthenticated users.
grant execute on function public.self_onboard_member to anon, authenticated;

-- ------------------------------------------------------------
-- 5. Public read-only lookup: resolve a slug to a church name,
--    so the onboarding page can show "Join [Church Name]"
--    without exposing anything else about the church.
-- ------------------------------------------------------------
create or replace function public.get_church_name_by_slug(p_slug text)
returns text
language sql
security definer
stable
as $$
  select name from public.churches
  where onboarding_slug = p_slug and deleted_at is null;
$$;

grant execute on function public.get_church_name_by_slug to anon, authenticated;
