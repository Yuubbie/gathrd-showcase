-- ============================================================
-- GATHRD — Week 3 Migration
-- RLS for Visitor Log & Discipleship Tracker
-- ============================================================

alter table public.visitors enable row level security;
alter table public.visits enable row level security;
alter table public.follow_up_tasks enable row level security;
alter table public.discipleship_records enable row level security;
alter table public.discipleship_stage_log enable row level security;

-- ------------------------------------------------------------
-- visitors — pastors/admins full access within their church.
-- No public/anonymous access at all (check_in_visitor RPC handles
-- writes for staff; there's no visitor-facing public flow here).
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_visitors"
on public.visitors for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- visits — read-only follows the parent visitor's church
-- ------------------------------------------------------------
create policy "pastors_admins_read_visits"
on public.visits for select
using (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- follow_up_tasks
--   - pastors/admins: full access within their church
--   - any logged-in member of the church can see (and update the
--     status of) tasks specifically assigned to them, so a regular
--     "designated worker" can do follow-up without needing admin rights
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_follow_up"
on public.follow_up_tasks for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

create policy "assigned_worker_read_own_tasks"
on public.follow_up_tasks for select
using (assigned_to = auth.uid());

create policy "assigned_worker_update_own_tasks"
on public.follow_up_tasks for update
using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());

-- ------------------------------------------------------------
-- discipleship_records — pastors/admins only. This is sensitive
-- pastoral data (someone's spiritual journey), tighter than the
-- general member registry.
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_discipleship"
on public.discipleship_records for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- Assigned pastor (even if not senior_pastor/admin) can see and
-- update their own assigned converts
create policy "assigned_pastor_read_own_converts"
on public.discipleship_records for select
using (assigned_pastor_id = auth.uid());

create policy "assigned_pastor_update_own_converts"
on public.discipleship_records for update
using (assigned_pastor_id = auth.uid())
with check (assigned_pastor_id = auth.uid());

-- ------------------------------------------------------------
-- discipleship_stage_log — follows the parent record's visibility
-- ------------------------------------------------------------
create policy "read_stage_log"
on public.discipleship_stage_log for select
using (
  exists (
    select 1 from public.discipleship_records d
    where d.id = discipleship_stage_log.discipleship_record_id
    and (d.church_id = public.current_church_id() or d.assigned_pastor_id = auth.uid())
  )
);

create policy "pastors_admins_write_stage_log"
on public.discipleship_stage_log for insert
with check (
  exists (
    select 1 from public.discipleship_records d
    where d.id = discipleship_stage_log.discipleship_record_id
    and (
      (d.church_id = public.current_church_id() and public.is_pastor_or_admin())
      or d.assigned_pastor_id = auth.uid()
    )
  )
);
