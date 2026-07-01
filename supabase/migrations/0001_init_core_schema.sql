-- ============================================================
-- GATHRD — Week 1 Migration
-- Core schema: churches, profiles (roles), audit_logs
-- Non-negotiable rule (Blueprint Section 16):
--   Every table gets 6 audit columns + soft delete. No exceptions.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Role enum — matches Blueprint Section 7 exactly (8 roles)
-- ------------------------------------------------------------
create type public.church_role as enum (
  'senior_pastor',        -- Full access, all branches
  'assistant_pastor',     -- Full access, single branch
  'church_admin',         -- Operational (secretary)
  'finance_admin',        -- Financial only
  'department_head',      -- Department only
  'cell_leader',          -- Cell only
  'childrens_teacher',    -- Children only
  'member'                -- Personal only
);

-- ------------------------------------------------------------
-- 1. Reusable audit columns + updated_at/by trigger
--    Every future migration should copy this column block
--    and attach the trigger below to the new table.
-- ------------------------------------------------------------
-- Column block to paste into every CREATE TABLE:
--   created_by uuid references auth.users(id),
--   created_at timestamptz not null default now(),
--   updated_by uuid references auth.users(id),
--   updated_at timestamptz not null default now(),
--   deleted_by uuid references auth.users(id),
--   deleted_at timestamptz

create or replace function public.set_audit_fields()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_by := auth.uid();
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.updated_by := auth.uid();
    new.updated_at := now();
    -- preserve original created_* values, never let client overwrite them
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 2. churches — one row per church subscription
-- ------------------------------------------------------------
create table public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  subdomain text unique,
  plan text not null default 'starter', -- starter | growth | church | enterprise
  paystack_sub_id text,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_churches_audit
before insert or update on public.churches
for each row execute function public.set_audit_fields();

-- ------------------------------------------------------------
-- 3. profiles — extends auth.users with church + role
--    This is what makes "8 role types can log in" work.
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  church_id uuid references public.churches(id),
  role public.church_role not null default 'member',
  full_name text not null,
  phone text,
  department_id uuid,   -- nullable FK, department table comes in a later module
  cell_group_id uuid,   -- nullable FK, cell_groups table comes in Week 6

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_profiles_audit
before insert or update on public.profiles
for each row execute function public.set_audit_fields();

-- Auto-create a profile row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce((new.raw_user_meta_data->>'role')::public.church_role, 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 4. audit_logs — Module 19, full audit trail from day one
-- ------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id),
  user_id uuid references auth.users(id),
  action text not null,          -- insert | update | soft_delete
  table_name text not null,
  record_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  timestamp timestamptz not null default now()
);

-- Helpful indexes
create index idx_profiles_church on public.profiles(church_id);
create index idx_audit_logs_church on public.audit_logs(church_id);
create index idx_audit_logs_record on public.audit_logs(table_name, record_id);
