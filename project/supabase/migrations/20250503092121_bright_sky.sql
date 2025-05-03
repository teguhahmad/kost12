/*
  # Add marketplace fields to properties table

  1. Changes
    - Add marketplace_enabled boolean field to properties table
    - Add marketplace_price numeric field to properties table
    - Add marketplace_status text field to properties table with enum constraint
    - Add default values for new fields

  2. Security
    - No changes to RLS policies needed as existing policies cover these fields
*/

-- Add marketplace fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS marketplace_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketplace_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketplace_status text DEFAULT 'draft'::text;

-- Add constraint for marketplace_status
ALTER TABLE properties 
ADD CONSTRAINT properties_marketplace_status_check 
CHECK (marketplace_status = ANY (ARRAY['draft'::text, 'published'::text]));