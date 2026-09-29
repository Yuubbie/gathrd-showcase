-- Fix RLS policy for churches table - simplified to avoid recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Allow district/zone to create branches" ON churches;
DROP POLICY IF EXISTS "Enable read access for own church and branches" ON churches;

-- Simple INSERT policy - uses auth.jwt() to avoid recursion
CREATE POLICY "Allow district/zone to create branches" ON churches
FOR INSERT
TO authenticated
WITH CHECK (
  -- Get user's church from JWT claim (no recursion)
  (auth.jwt() ->> 'church_id')::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM churches c
    WHERE c.id = (auth.jwt() ->> 'church_id')::uuid
    AND c.hierarchy_level IN ('district', 'zone')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = c.id
      AND p.role IN ('senior_pastor', 'assistant_pastor', 'church_admin')
    )
  )
);

-- Simple SELECT policy using JWT claim
DROP POLICY IF EXISTS "Enable read access for own church and branches" ON churches;
CREATE POLICY "Enable read access for own church and branches" ON churches
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() ->> 'church_id')::uuid
  OR parent_church_id = (auth.jwt() ->> 'church_id')::uuid
);