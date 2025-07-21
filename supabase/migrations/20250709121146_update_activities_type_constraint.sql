-- Update activities table to allow new activity types for lead management
-- First, drop the existing check constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;

-- Add the new check constraint with updated allowed types
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
CHECK (type IN ('created', 'follow_up', 'note_added', 'task_added', 'assigned', 'status_changed'));

-- Update any existing activities that might have invalid types
UPDATE activities 
SET type = 'created' 
WHERE type NOT IN ('created', 'follow_up', 'note_added', 'task_added', 'assigned', 'status_changed'); 