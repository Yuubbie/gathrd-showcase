-- ============================================================
-- GATHRD — Week 1 Migration
-- Row Level Security: enforced at the DB level per Blueprint
-- Section 16 non-negotiable rule ("not just the frontend").
-- ============================================================

alter table public.churches enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- ------------------------------------------------------------
-- Helper: get the caller's role and church_id without recursion
-- ------------------------------------------------------------
create or replace function public.current_role()
returns public.church_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.current_church_id()
returns uuid as $$
  select church_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.is_pastor_or_admin()
returns boolean as $$
  select public.current_role() in ('senior_pastor', 'assistant_pastor', 'church_admin');
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- churches — everyone in the church can read their own church row;
-- only senior_pastor can update church settings (billing, plan, etc.)
-- ------------------------------------------------------------
create policy "members_read_own_church"
on public.churches for select
using (id = public.current_church_id());

create policy "senior_pastor_update_church"
on public.churches for update
using (
  id = public.current_church_id()
  and public.current_role() = 'senior_pastor'
);

-- ------------------------------------------------------------
-- profiles
--   - everyone can read their own profile
--   - senior_pastor / assistant_pastor / church_admin can read all
--     profiles within their own church
--   - cell_leader can read only their own cell's members (added when
--     cell_groups ships in Week 6 — placeholder policy kept narrow now)
--   - only pastors/admins can edit other people's profiles
-- ------------------------------------------------------------
create policy "read_own_profile"
on public.profiles for select
using (id = auth.uid());

create policy "pastors_admins_read_church_profiles"
on public.profiles for select
using (
  church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

create policy "update_own_profile"
on public.profiles for update
using (id = auth.uid());

create policy "pastors_admins_update_church_profiles"
on public.profiles for update
using (
  church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

-- ------------------------------------------------------------
-- audit_logs — read-only for pastors/admins of the same church.
-- No one gets update/delete access — audit logs are append-only.
-- ------------------------------------------------------------
create policy "pastors_admins_read_audit_logs"
on public.audit_logs for select
using (
  church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

create policy "system_insert_audit_logs"
on public.audit_logs for insert
with check (church_id = public.current_church_id());
