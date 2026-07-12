-- ============================================================
-- GATHRD — Fix: churches UPDATE policy only allowed senior_pastor,
-- but Giving Settings (and the new onboarding/church settings)
-- are accessible in the UI to assistant_pastor and church_admin
-- too. Without this fix, their saves would silently fail RLS.
-- ============================================================

drop policy if exists "senior_pastor_update_church" on public.churches;

create policy "pastors_admins_update_church"
on public.churches for update
using (
  id = public.current_church_id()
  and public.is_pastor_or_admin()
);
