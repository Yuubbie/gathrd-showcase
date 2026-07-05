-- ============================================================
-- GATHRD — Week 5 Migration
-- RLS for Announcements & Milestone tables
-- ============================================================

alter table public.message_templates enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
alter table public.milestone_messages_log enable row level security;

-- ------------------------------------------------------------
-- message_templates — readable by all logged-in staff of the
-- church, editable only by pastors/admins (Blueprint: "editable
-- by the church admin")
-- ------------------------------------------------------------
create policy "read_templates_in_church"
on public.message_templates for select
using (church_id = public.current_church_id());

create policy "pastors_admins_write_templates"
on public.message_templates for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- announcements — pastors/admins full access
-- ------------------------------------------------------------
create policy "pastors_admins_full_access_announcements"
on public.announcements for all
using (church_id = public.current_church_id() and public.is_pastor_or_admin())
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());

-- ------------------------------------------------------------
-- announcement_recipients — visible to pastors/admins of the
-- same church as the parent announcement (for read-receipt view)
-- ------------------------------------------------------------
create policy "pastors_admins_read_recipients"
on public.announcement_recipients for select
using (
  exists (
    select 1 from public.announcements a
    where a.id = announcement_recipients.announcement_id
    and a.church_id = public.current_church_id()
    and public.is_pastor_or_admin()
  )
);

-- Recipient rows are only ever written by the Edge Function using
-- the service role key (bypasses RLS entirely), so no insert/update
-- policy is needed for regular users here.

-- ------------------------------------------------------------
-- milestone_messages_log — pastors/admins only
-- ------------------------------------------------------------
create policy "pastors_admins_read_milestone_log"
on public.milestone_messages_log for select
using (church_id = public.current_church_id() and public.is_pastor_or_admin());

create policy "pastors_admins_write_milestone_log"
on public.milestone_messages_log for insert
with check (church_id = public.current_church_id() and public.is_pastor_or_admin());
