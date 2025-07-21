-- Add lead_status field to people table for lead management
ALTER TABLE people ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'staging';

-- Create index for lead status filtering
CREATE INDEX IF NOT EXISTS idx_people_lead_status ON people(lead_status);

-- Update existing leads to have 'assigned' status if they have an assigned_to user
UPDATE people 
SET lead_status = 'assigned' 
WHERE client_type = 'lead' 
AND assigned_to IS NOT NULL 
AND lead_status = 'staging';

-- Update existing non-leads to have NULL lead_status
UPDATE people 
SET lead_status = NULL 
WHERE client_type != 'lead'; 