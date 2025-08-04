-- Add archived_at and archived_by fields to people table
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users(id);

-- Create index for better query performance on archived leads
CREATE INDEX IF NOT EXISTS idx_people_archived_at ON people(archived_at);

-- Create index for lead_status and archived_at combination
CREATE INDEX IF NOT EXISTS idx_people_lead_status_archived ON people(lead_status, archived_at);