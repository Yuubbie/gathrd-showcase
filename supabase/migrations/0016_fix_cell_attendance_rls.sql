-- ============================================================
-- GATHRD — Fix: pastors/admins could only READ cell_meeting_attendance,
-- not write to it. This blocked a pastor from submitting a report
-- for a cell group that doesn't have a leader assigned yet (or any
-- cell group at all, since only the read policy existed).
-- ============================================================

drop policy if exists "pastors_admins_read_cell_attendance" on public.cell_meeting_attendance;

create policy "pastors_admins_full_access_cell_attendance"
on public.cell_meeting_attendance for all
using (
  exists (
    select 1 from public.cell_group_meeting_reports r
    where r.id = cell_meeting_attendance.meeting_report_id
    and r.church_id = public.current_church_id()
    and public.is_pastor_or_admin()
  )
)
with check (
  exists (
    select 1 from public.cell_group_meeting_reports r
    where r.id = cell_meeting_attendance.meeting_report_id
    and r.church_id = public.current_church_id()
    and public.is_pastor_or_admin()
  )
);