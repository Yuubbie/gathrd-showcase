-- Branch-creation and branch-visibility rules for the churches table.
--
-- These were applied to production by hand and were never in a migration. They are recorded
-- here, copied exactly from the live database, so it can be rebuilt from the migrations.
-- (An older, different version used to sit in fix_rls_v3.sql at the repo root; it was replaced
-- later by the version below, which is what is live.)
--
-- They are already live, so there is no need to run this on production.
-- Safe to run again: each statement replaces what is there.
--
-- Hardening to do later: can_create_branch is SECURITY DEFINER without a fixed search_path.
-- It is recorded as it is live; a follow-up migration should add `set search_path = public`.

CREATE OR REPLACE FUNCTION public.can_create_branch(new_parent_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM churches c
    WHERE c.id = new_parent_id
    AND c.hierarchy_level IN ('district', 'zone')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = c.id
      AND p.role IN ('senior_pastor', 'assistant_pastor', 'church_admin')
    )
  );
END;
$function$;

DROP POLICY IF EXISTS "Allow district/zone to create branches" ON public.churches;
CREATE POLICY "Allow district/zone to create branches" ON public.churches
  FOR INSERT
  TO authenticated
  WITH CHECK (can_create_branch(parent_church_id));

DROP POLICY IF EXISTS "Enable read access for own church and branches" ON public.churches;
CREATE POLICY "Enable read access for own church and branches" ON public.churches
  FOR SELECT
  TO authenticated
  USING (
    (id = (SELECT profiles.church_id FROM profiles WHERE (profiles.id = auth.uid())))
    OR (parent_church_id = (SELECT profiles.church_id FROM profiles WHERE (profiles.id = auth.uid())))
  );
