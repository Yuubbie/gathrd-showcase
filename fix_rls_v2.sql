-- Fix RLS policy for churches table - more permissive for testing
-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Allow district/zone to create branches" ON churches;

-- Create simpler INSERT policy for testing
CREATE POLICY "Allow district/zone to create branches" ON churches
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM churches parent
    WHERE parent.id = churches.parent_church_id
    AND parent.hierarchy_level IN ('district', 'zone')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.church_id = parent.id
    )
  )
);