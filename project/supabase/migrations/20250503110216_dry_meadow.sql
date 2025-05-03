/*
  # Marketplace Settings Schema Update

  1. New Columns
    - Add marketplace-related columns to properties table:
      - common_amenities (text[])
      - parking_amenities (text[])
      - photos (text[])
      - description (text)

  2. Room Types Table
    - Create room_types table for managing different room configurations
    - Add RLS policies for property owners

  3. Security
    - Enable RLS on room_types table
    - Add RLS policies for CRUD operations
*/

-- Add new columns to properties table individually
DO $$ 
BEGIN
  -- Add common_amenities column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'common_amenities'
  ) THEN
    ALTER TABLE properties ADD COLUMN common_amenities text[] DEFAULT '{}';
  END IF;

  -- Add parking_amenities column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'parking_amenities'
  ) THEN
    ALTER TABLE properties ADD COLUMN parking_amenities text[] DEFAULT '{}';
  END IF;

  -- Add photos column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'photos'
  ) THEN
    ALTER TABLE properties ADD COLUMN photos text[] DEFAULT '{}';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'description'
  ) THEN
    ALTER TABLE properties ADD COLUMN description text;
  END IF;
END $$;

-- Create room_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  facilities text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on room_types
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_types
CREATE POLICY "Users can view room types"
  ON room_types
  FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert room types"
  ON room_types
  FOR INSERT
  TO authenticated
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update room types"
  ON room_types
  FOR UPDATE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  ))
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete room types"
  ON room_types
  FOR DELETE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  ));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS room_types_property_id_idx ON room_types(property_id);
