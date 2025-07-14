-- Fix follow_ups table schema
-- Remove due_date column if it exists (it should be scheduled_date instead)
ALTER TABLE follow_ups DROP COLUMN IF EXISTS due_date;

-- Ensure scheduled_date exists and is NOT NULL
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone;
ALTER TABLE follow_ups ALTER COLUMN scheduled_date SET NOT NULL;

-- Update existing records to have a default scheduled_date if they don't have one
UPDATE follow_ups 
SET scheduled_date = created_at 
WHERE scheduled_date IS NULL;

-- Ensure type column exists with default
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'call';

-- Ensure assigned_to column exists
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing follow-ups to assign them to the person's assigned_to user
UPDATE follow_ups 
SET assigned_to = people.assigned_to 
FROM people 
WHERE follow_ups.person_id = people.id 
AND follow_ups.assigned_to IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to); 