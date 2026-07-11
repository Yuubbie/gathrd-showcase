-- ============================================================
-- GATHRD — Week 6 Migration
-- RLS for Cell Group Management
-- ============================================================

alter table public.cell_group_meeting_reports enable row level security;
alter table public.cell_meeting_attendance enable row level security;

-- ------------------------------------------------------------
-- Helper: does the caller lead this specific cell group?
-- ------------------------------------------------------------
create or replace function public.is_leader_of_cell(p_cell_group_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.cell_groups
    where id = p_cell_group_id and leader_profile_id = auth.uid()
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- cell_group_meeting_reports
--   - pastors/admins: full access across all cells in their church
--   - cell_leader: full access, but only for the cell group they lead
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_cell_reports"
on public.cell_group_meeting_reports for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

create policy "cell_leader_manage_own_reports"
on public.cell_group_meeting_reports for all
using (church_id = public.current_church_id() and public.is_leader_of_cell(cell_group_id))
with check (church_id = public.current_church_id() and public.is_leader_of_cell(cell_group_id));

-- ------------------------------------------------------------
-- cell_meeting_attendance — follows the parent report's visibility
-- ------------------------------------------------------------
create policy "pastors_admins_read_cell_attendance"
on public.cell_meeting_attendance for select
using (
  exists (
    select 1 from public.cell_group_meeting_reports r
    where r.id = cell_meeting_attendance.meeting_report_id
    and r.church_id = public.current_church_id()
    and public.is_pastor_or_admin()
  )
);

create policy "cell_leader_manage_own_attendance"
on public.cell_meeting_attendance for all
using (
  exists (
    select 1 from public.cell_group_meeting_reports r
    where r.id = cell_meeting_attendance.meeting_report_id
    and public.is_leader_of_cell(r.cell_group_id)
  )
)
with check (
  exists (
    select 1 from public.cell_group_meeting_reports r
    where r.id = cell_meeting_attendance.meeting_report_id
    and public.is_leader_of_cell(r.cell_group_id)
  )
);
