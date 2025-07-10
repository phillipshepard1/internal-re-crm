-- Add scheduled_date column to follow_ups table
ALTER TABLE follow_ups ADD COLUMN scheduled_date timestamp with time zone;

-- Update existing records to have a default scheduled_date if they don't have one
UPDATE follow_ups 
SET scheduled_date = created_at 
WHERE scheduled_date IS NULL;

-- Make scheduled_date NOT NULL after setting default values
ALTER TABLE follow_ups ALTER COLUMN scheduled_date SET NOT NULL; 