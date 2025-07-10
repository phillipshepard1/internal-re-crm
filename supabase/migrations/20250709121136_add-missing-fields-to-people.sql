-- Add missing fields to people table to match the enhanced interface
ALTER TABLE people ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Add properties fields (these might be stored as JSON or separate fields)
ALTER TABLE people ADD COLUMN IF NOT EXISTS looking_for TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS selling TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS closed TEXT; 