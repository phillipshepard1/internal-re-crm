-- Add pixel tracking columns to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS pixel_source_url TEXT,
ADD COLUMN IF NOT EXISTS pixel_referrer TEXT,
ADD COLUMN IF NOT EXISTS pixel_api_key TEXT;

-- Create index for pixel tracking
CREATE INDEX IF NOT EXISTS idx_people_pixel_api_key ON people(pixel_api_key);
CREATE INDEX IF NOT EXISTS idx_people_pixel_source_url ON people(pixel_source_url);