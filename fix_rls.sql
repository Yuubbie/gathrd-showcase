-- Fix RLS policy for churches table to allow district/zone to create branches

-- First check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'churches';

-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Allow district/zone to create branches" ON churches;

-- Create new INSERT policy allowing district/zone churches to create branches
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
      AND profiles.role IN ('senior_pastor', 'assistant_pastor', 'church_admin')
    )
  )
);