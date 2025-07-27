-- Add initial follow-up logic for newly assigned leads
-- Migration: 20250709121154_add_initial_followup_logic.sql

-- Function to create initial follow-up for newly assigned leads (next day)
CREATE OR REPLACE FUNCTION create_initial_followup_for_person(person_id UUID)
RETURNS UUID AS $$
DECLARE
  person_record RECORD;
  next_date DATE;
  new_followup_id UUID;
BEGIN
  -- Get person's follow-up settings
  SELECT 
    p.follow_up_frequency,
    p.follow_up_day_of_week,
    p.assigned_to
  INTO person_record
  FROM people p
  WHERE p.id = person_id;

  -- If no assigned user, don't create follow-up
  IF person_record.assigned_to IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate next follow-up date (ALWAYS next day for initial follow-up)
  next_date := CURRENT_DATE + INTERVAL '1 day';

  -- Create the initial follow-up
  INSERT INTO follow_ups (
    person_id,
    scheduled_date,
    status,
    type,
    notes,
    assigned_to
  ) VALUES (
    person_id,
    next_date::TIMESTAMP WITH TIME ZONE,
    'pending',
    'call',
    'Initial follow-up for newly assigned lead (next day)',
    person_record.assigned_to
  ) RETURNING id INTO new_followup_id;

  -- Update the person's last follow-up date to today (so subsequent follow-ups use frequency rules)
  UPDATE people 
  SET last_follow_up_date = CURRENT_DATE::TIMESTAMP WITH TIME ZONE
  WHERE id = person_id;

  RETURN new_followup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create initial follow-up with custom date (for testing/debugging)
CREATE OR REPLACE FUNCTION create_initial_followup_for_person_with_date(person_id UUID, custom_date DATE)
RETURNS UUID AS $$
DECLARE
  person_record RECORD;
  new_followup_id UUID;
BEGIN
  -- Get person's follow-up settings
  SELECT 
    p.follow_up_frequency,
    p.follow_up_day_of_week,
    p.assigned_to
  INTO person_record
  FROM people p
  WHERE p.id = person_id;

  -- If no assigned user, don't create follow-up
  IF person_record.assigned_to IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create the initial follow-up with custom date
  INSERT INTO follow_ups (
    person_id,
    scheduled_date,
    status,
    type,
    notes,
    assigned_to
  ) VALUES (
    person_id,
    custom_date::TIMESTAMP WITH TIME ZONE,
    'pending',
    'call',
    'Initial follow-up for newly assigned lead (custom date)',
    person_record.assigned_to
  ) RETURNING id INTO new_followup_id;

  -- Update the person's last follow-up date to the day before the custom date
  UPDATE people 
  SET last_follow_up_date = (custom_date - INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
  WHERE id = person_id;

  RETURN new_followup_id;
END;
$$ LANGUAGE plpgsql;

-- Add a flag to track if this is the initial follow-up
ALTER TABLE people ADD COLUMN IF NOT EXISTS has_initial_followup BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_people_has_initial_followup ON people(has_initial_followup);

-- Update existing people to mark them as having initial follow-ups if they have any follow-ups
UPDATE people 
SET has_initial_followup = TRUE 
WHERE id IN (
  SELECT DISTINCT person_id 
  FROM follow_ups 
  WHERE status = 'completed'
); 