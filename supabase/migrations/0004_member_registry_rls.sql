-- ============================================================
-- GATHRD — Week 2 Migration
-- RLS for Member Registry tables
-- ============================================================

alter table public.departments enable row level security;
alter table public.cell_groups enable row level security;
alter table public.members enable row level security;
alter table public.member_departments enable row level security;

-- ------------------------------------------------------------
-- Helper: is the caller a cell_leader, and if so, which cell?
-- ------------------------------------------------------------
create or replace function public.current_cell_group_id()
returns uuid as $$
  select cell_group_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- departments — readable by everyone in the church who's logged
-- in; writable only by pastors/admins
-- ------------------------------------------------------------
create policy "read_departments_in_church"
on public.departments for select
using (church_id = public.current_church_id());

create policy "pastors_admins_write_departments"
on public.departments for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- cell_groups — same pattern
-- ------------------------------------------------------------
create policy "read_cell_groups_in_church"
on public.cell_groups for select
using (church_id = public.current_church_id());

create policy "pastors_admins_write_cell_groups"
on public.cell_groups for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- members — the sensitive one
--   - pastors/admins/church_admin: full read+write within their church
--   - cell_leader: read+update only members in their own cell group
--   - member (logged-in): read only their own linked record
--   - anonymous/public: NO direct table access at all —
--     self-onboarding goes through the RPC, not a table policy
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_members"
on public.members for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

create policy "cell_leader_read_own_cell_members"
on public.members for select
using (
  church_id = public.current_church_id()
  and public.current_role() = 'cell_leader'
  and cell_group_id = public.current_cell_group_id()
);

create policy "cell_leader_update_own_cell_members"
on public.members for update
using (
  church_id = public.current_church_id()
  and public.current_role() = 'cell_leader'
  and cell_group_id = public.current_cell_group_id()
);

create policy "member_read_own_record"
on public.members for select
using (profile_id = auth.uid());

-- Deliberately NO insert policy for anon/authenticated here.
-- All member creation happens via:
--   1. self_onboard_member() RPC (public QR/link flow), or
--   2. pastors_admins_full_access_members (admin manually adds)

-- ------------------------------------------------------------
-- member_departments — follows the parent member's visibility
-- ------------------------------------------------------------
create policy "read_member_departments"
on public.member_departments for select
using (
  exists (
    select 1 from public.members m
    where m.id = member_departments.member_id
    and m.church_id = public.current_church_id()
  )
);

create policy "pastors_admins_write_member_departments"
on public.member_departments for all
using (
  exists (
    select 1 from public.members m
    where m.id = member_departments.member_id
    and m.church_id = public.current_church_id()
    and public.is_pastor_or_admin()
  )
);
