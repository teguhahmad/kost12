/*
  # Fix Room Types RLS Policies

  1. Changes
    - Drop existing policies to start fresh
    - Create new comprehensive RLS policies for room_types table
    - Add proper policies for property owners and superadmins

  2. Security
    - Enable RLS on room_types table
    - Property owners can manage room types for their own properties
    - Superadmins have full access to all room types
*/

-- First, drop any existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Property owners can create room types" ON room_types;
  DROP POLICY IF EXISTS "Property owners can delete room types" ON room_types;
  DROP POLICY IF EXISTS "Property owners can update room types" ON room_types;
  DROP POLICY IF EXISTS "Property owners can view room types" ON room_types;
  DROP POLICY IF EXISTS "Superadmins have full access" ON room_types;
  DROP POLICY IF EXISTS "Superadmins can manage all room types" ON room_types;
END $$;

-- Enable RLS
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Create new policies

-- Allow property owners to view their own room types
CREATE POLICY "view_room_types"
ON room_types
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE owner_id = auth.uid()
  )
);

-- Allow property owners to create room types for their properties
CREATE POLICY "create_room_types"
ON room_types
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties
    WHERE owner_id = auth.uid()
  )
);

-- Allow property owners to update their own room types
CREATE POLICY "update_room_types"
ON room_types
FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM properties
    WHERE owner_id = auth.uid()
  )
);

-- Allow property owners to delete their own room types
CREATE POLICY "delete_room_types"
ON room_types
FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE owner_id = auth.uid()
  )
);

-- Superadmin full access policy
CREATE POLICY "superadmin_full_access"
ON room_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM backoffice_users
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM backoffice_users
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  )
);