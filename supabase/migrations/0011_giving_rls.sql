-- ============================================================
-- GATHRD — Week 4 Migration
-- RLS for giving data
-- Blueprint: "Top givers report — visible to pastor and finance
-- admin only" / "Only Finance Admin and Pastor can view completed
-- counting sheets"
-- ============================================================

alter table public.giving_records enable row level security;
alter table public.offering_counting_sessions enable row level security;
alter table public.offering_counting_entries enable row level security;

-- ------------------------------------------------------------
-- Helper: is the caller specifically finance_admin or a pastor?
-- (Tighter than is_pastor_or_admin(), which also includes
-- church_admin — giving data is more sensitive than general admin.)
-- ------------------------------------------------------------
create or replace function public.can_view_finances()
returns boolean as $$
  select public.current_role() in ('senior_pastor', 'assistant_pastor', 'finance_admin');
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- giving_records
-- ------------------------------------------------------------
create policy "finance_roles_full_access_giving"
on public.giving_records for all
using (church_id = public.current_church_id() and public.can_view_finances())
with check (church_id = public.current_church_id() and public.can_view_finances());

-- A member can see their own giving history (Blueprint: "Member
-- can view their own giving history from member portal")
create policy "member_read_own_giving"
on public.giving_records for select
using (
  member_id in (select id from public.members where profile_id = auth.uid())
);

-- ------------------------------------------------------------
-- offering_counting_sessions / entries — finance roles only,
-- full stop. This is stricter than giving_records because it's
-- the raw cash-handling integrity check, not just financial data.
-- ------------------------------------------------------------
create policy "finance_roles_full_access_counting_sessions"
on public.offering_counting_sessions for all
using (church_id = public.current_church_id() and public.can_view_finances())
with check (church_id = public.current_church_id() and public.can_view_finances());

create policy "finance_roles_access_counting_entries"
on public.offering_counting_entries for all
using (
  exists (
    select 1 from public.offering_counting_sessions s
    where s.id = offering_counting_entries.counting_session_id
    and s.church_id = public.current_church_id()
    and public.can_view_finances()
  )
)
with check (
  exists (
    select 1 from public.offering_counting_sessions s
    where s.id = offering_counting_entries.counting_session_id
    and s.church_id = public.current_church_id()
    and public.can_view_finances()
  )
);
