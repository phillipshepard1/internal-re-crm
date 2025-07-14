-- Add assigned_to column to follow_ups table
ALTER TABLE follow_ups ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing follow-ups to assign them to the person's assigned_to user
UPDATE follow_ups 
SET assigned_to = people.assigned_to 
FROM people 
WHERE follow_ups.person_id = people.id 
AND follow_ups.assigned_to IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to); 