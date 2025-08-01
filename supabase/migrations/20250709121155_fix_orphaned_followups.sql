-- Fix orphaned follow-ups issue
-- Migration: 20250709121155_fix_orphaned_followups.sql

-- First, clean up any existing orphaned follow-ups
DELETE FROM follow_ups 
WHERE person_id NOT IN (SELECT id FROM people);

-- Improve the create_initial_followup_for_person function to check if person exists
CREATE OR REPLACE FUNCTION create_initial_followup_for_person(person_id UUID)
RETURNS UUID AS $$
DECLARE
  person_record RECORD;
  next_date DATE;
  new_followup_id UUID;
BEGIN
  -- Check if person exists and get their follow-up settings
  SELECT 
    p.id,
    p.follow_up_frequency,
    p.follow_up_day_of_week,
    p.assigned_to,
    p.first_name,
    p.last_name
  INTO person_record
  FROM people p
  WHERE p.id = person_id;

  -- If person doesn't exist, don't create follow-up
  IF person_record.id IS NULL THEN
    RAISE WARNING 'Person with ID % does not exist, cannot create follow-up', person_id;
    RETURN NULL;
  END IF;

  -- If person exists but has no name, don't create follow-up
  IF person_record.first_name IS NULL OR person_record.last_name IS NULL OR 
     person_record.first_name = '' OR person_record.last_name = '' THEN
    RAISE WARNING 'Person with ID % has incomplete name data, cannot create follow-up', person_id;
    RETURN NULL;
  END IF;

  -- If no assigned user, don't create follow-up
  IF person_record.assigned_to IS NULL THEN
    RAISE WARNING 'Person with ID % has no assigned user, cannot create follow-up', person_id;
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

-- Also improve the create_initial_followup_for_person_with_date function
CREATE OR REPLACE FUNCTION create_initial_followup_for_person_with_date(person_id UUID, custom_date DATE)
RETURNS UUID AS $$
DECLARE
  person_record RECORD;
  new_followup_id UUID;
BEGIN
  -- Check if person exists and get their follow-up settings
  SELECT 
    p.id,
    p.follow_up_frequency,
    p.follow_up_day_of_week,
    p.assigned_to,
    p.first_name,
    p.last_name
  INTO person_record
  FROM people p
  WHERE p.id = person_id;

  -- If person doesn't exist, don't create follow-up
  IF person_record.id IS NULL THEN
    RAISE WARNING 'Person with ID % does not exist, cannot create follow-up', person_id;
    RETURN NULL;
  END IF;

  -- If person exists but has no name, don't create follow-up
  IF person_record.first_name IS NULL OR person_record.last_name IS NULL OR 
     person_record.first_name = '' OR person_record.last_name = '' THEN
    RAISE WARNING 'Person with ID % has incomplete name data, cannot create follow-up', person_id;
    RETURN NULL;
  END IF;

  -- If no assigned user, don't create follow-up
  IF person_record.assigned_to IS NULL THEN
    RAISE WARNING 'Person with ID % has no assigned user, cannot create follow-up', person_id;
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

-- Create a function to validate and clean up people data
CREATE OR REPLACE FUNCTION validate_people_data()
RETURNS TABLE(person_id UUID, issue TEXT) AS $$
BEGIN
  -- Find people with missing or empty names
  RETURN QUERY
  SELECT p.id, 'Missing or empty first_name or last_name' as issue
  FROM people p
  WHERE p.first_name IS NULL OR p.last_name IS NULL OR 
        p.first_name = '' OR p.last_name = '';
  
  -- Find people with no assigned_to
  RETURN QUERY
  SELECT p.id, 'No assigned_to user' as issue
  FROM people p
  WHERE p.assigned_to IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up invalid people records
CREATE OR REPLACE FUNCTION cleanup_invalid_people()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete people with missing names (they can't be used for follow-ups anyway)
  DELETE FROM people 
  WHERE first_name IS NULL OR last_name IS NULL OR 
        first_name = '' OR last_name = '';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 