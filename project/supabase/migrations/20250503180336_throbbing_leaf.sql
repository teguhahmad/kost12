/*
  # Add RLS policies for room_types table

  1. Security
    - Enable RLS on room_types table
    - Add policies for:
      - Superadmins can manage all room types
      - Users can manage room types for their properties
      - Users can view room types for their properties
*/

-- Enable RLS
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all room types
CREATE POLICY "Superadmins can manage all room types"
  ON room_types
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM backoffice_users
      WHERE backoffice_users.user_id = auth.uid()
      AND backoffice_users.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM backoffice_users
      WHERE backoffice_users.user_id = auth.uid()
      AND backoffice_users.role = 'superadmin'
    )
  );

-- Users can manage room types for their properties
CREATE POLICY "Users can manage room types for their properties"
  ON room_types
  AS PERMISSIVE
  FOR ALL 
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties
      WHERE properties.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties
      WHERE properties.owner_id = auth.uid()
    )
  );

-- Users can view room types for their properties
CREATE POLICY "Users can view room types"
  ON room_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties
      WHERE properties.owner_id = auth.uid()
    )
  );