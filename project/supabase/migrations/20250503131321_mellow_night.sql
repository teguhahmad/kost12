/*
  # Add RLS policies for room_types table

  1. Security
    - Enable RLS on room_types table
    - Add policies for:
      - Property owners can manage room types for their properties
      - Users can view room types for their properties
      - Superadmins can manage all room types

  2. Changes
    - Enable RLS on room_types table
    - Add CRUD policies for property owners
    - Add read policy for users
    - Add superadmin policies
*/

-- Enable RLS
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Property owners can manage room types for their properties
CREATE POLICY "Users can manage room types for their properties"
ON room_types
FOR ALL
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

-- Superadmins can manage all room types
CREATE POLICY "Superadmins can manage all room types"
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