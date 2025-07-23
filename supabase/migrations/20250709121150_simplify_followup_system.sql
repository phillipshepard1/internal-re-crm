-- Simplify follow-up system with frequency-based scheduling
-- Migration: 20250709121150_simplify_followup_system.sql

-- Add frequency field to people table for follow-up scheduling
ALTER TABLE people ADD COLUMN IF NOT EXISTS follow_up_frequency TEXT CHECK (follow_up_frequency IN ('twice_week', 'weekly', 'biweekly', 'monthly')) DEFAULT 'weekly';

-- Add preferred day of week for follow-ups (0=Sunday, 1=Monday, etc.)
ALTER TABLE people ADD COLUMN IF NOT EXISTS follow_up_day_of_week INTEGER DEFAULT 1; -- Default to Monday

-- Add last follow-up date to track when to create next follow-up
ALTER TABLE people ADD COLUMN IF NOT EXISTS last_follow_up_date TIMESTAMP WITH TIME ZONE;

-- Remove the complex follow-up plan system (we'll keep the tables for now but mark as deprecated)
-- The follow_up_plan_id field will remain but won't be used in the new system

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_people_follow_up_frequency ON people(follow_up_frequency);
CREATE INDEX IF NOT EXISTS idx_people_follow_up_day ON people(follow_up_day_of_week);
CREATE INDEX IF NOT EXISTS idx_people_last_follow_up ON people(last_follow_up_date);

-- Function to calculate next follow-up date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_followup_date(
  frequency TEXT,
  day_of_week INTEGER,
  last_followup_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  next_date DATE;
  current_date_val DATE := COALESCE(last_followup_date::DATE, CURRENT_DATE);
  target_day_of_week INTEGER;
BEGIN
  -- If no last follow-up date, start from today
  IF last_followup_date IS NULL THEN
    current_date_val := CURRENT_DATE;
  END IF;

  -- Calculate the next date based on frequency
  CASE frequency
    WHEN 'twice_week' THEN
      -- For twice a week, we need to find the next occurrence
      -- If today is Monday, next is Thursday (day 4)
      -- If today is Thursday, next is next Monday (day 1)
      IF EXTRACT(DOW FROM current_date_val) = 1 THEN -- Monday
        next_date := current_date_val + INTERVAL '3 days'; -- Thursday
      ELSIF EXTRACT(DOW FROM current_date_val) = 4 THEN -- Thursday
        next_date := current_date_val + INTERVAL '4 days'; -- Next Monday
      ELSE
        -- Find next Monday or Thursday, whichever comes first
        IF EXTRACT(DOW FROM current_date_val) < 4 THEN
          next_date := current_date_val + (4 - EXTRACT(DOW FROM current_date_val))::INTEGER * INTERVAL '1 day';
        ELSE
          next_date := current_date_val + (8 - EXTRACT(DOW FROM current_date_val))::INTEGER * INTERVAL '1 day';
        END IF;
      END IF;
      
    WHEN 'weekly' THEN
      -- Find next occurrence of the specified day of week
      target_day_of_week := day_of_week;
      next_date := current_date_val + ((target_day_of_week + 7 - EXTRACT(DOW FROM current_date_val)) % 7)::INTEGER * INTERVAL '1 day';
      -- If the calculated date is today, add 7 days
      IF next_date = current_date_val THEN
        next_date := next_date + INTERVAL '7 days';
      END IF;
      
    WHEN 'biweekly' THEN
      -- Find next occurrence of the specified day of week, then add 2 weeks
      target_day_of_week := day_of_week;
      next_date := current_date_val + ((target_day_of_week + 7 - EXTRACT(DOW FROM current_date_val)) % 7)::INTEGER * INTERVAL '1 day';
      -- If the calculated date is today, add 14 days
      IF next_date = current_date_val THEN
        next_date := next_date + INTERVAL '14 days';
      ELSE
        next_date := next_date + INTERVAL '7 days';
      END IF;
      
    WHEN 'monthly' THEN
      -- Find the first occurrence of the specified day of week in the next month
      target_day_of_week := day_of_week;
      next_date := current_date_val + INTERVAL '1 month';
      -- Adjust to the specified day of week in that month
      next_date := next_date + ((target_day_of_week + 7 - EXTRACT(DOW FROM next_date)) % 7)::INTEGER * INTERVAL '1 day';
      
    ELSE
      -- Default to weekly
      target_day_of_week := day_of_week;
      next_date := current_date_val + ((target_day_of_week + 7 - EXTRACT(DOW FROM current_date_val)) % 7)::INTEGER * INTERVAL '1 day';
      IF next_date = current_date_val THEN
        next_date := next_date + INTERVAL '7 days';
      END IF;
  END CASE;

  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create next follow-up for a person
CREATE OR REPLACE FUNCTION create_next_followup_for_person(person_id UUID)
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
    p.last_follow_up_date,
    p.assigned_to
  INTO person_record
  FROM people p
  WHERE p.id = person_id;

  -- If no frequency set, don't create follow-up
  IF person_record.follow_up_frequency IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate next follow-up date
  next_date := calculate_next_followup_date(
    person_record.follow_up_frequency,
    person_record.follow_up_day_of_week,
    person_record.last_follow_up_date
  );

  -- Create the follow-up
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
    'Automated follow-up based on frequency schedule',
    person_record.assigned_to
  ) RETURNING id INTO new_followup_id;

  -- Update the person's last follow-up date
  UPDATE people 
  SET last_follow_up_date = next_date::TIMESTAMP WITH TIME ZONE
  WHERE id = person_id;

  RETURN new_followup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create follow-ups for all people who need them
CREATE OR REPLACE FUNCTION create_pending_followups()
RETURNS INTEGER AS $$
DECLARE
  person_record RECORD;
  followup_count INTEGER := 0;
BEGIN
  -- Find all people who need new follow-ups
  FOR person_record IN 
    SELECT 
      p.id,
      p.follow_up_frequency,
      p.follow_up_day_of_week,
      p.last_follow_up_date,
      p.assigned_to
    FROM people p
    WHERE 
      p.follow_up_frequency IS NOT NULL
      AND p.assigned_to IS NOT NULL
      AND (
        p.last_follow_up_date IS NULL 
        OR p.last_follow_up_date < CURRENT_DATE
      )
      AND NOT EXISTS (
        SELECT 1 FROM follow_ups fu 
        WHERE fu.person_id = p.id 
        AND fu.status = 'pending'
        AND fu.scheduled_date >= CURRENT_DATE
      )
  LOOP
    -- Create next follow-up for this person
    PERFORM create_next_followup_for_person(person_record.id);
    followup_count := followup_count + 1;
  END LOOP;

  RETURN followup_count;
END;
$$ LANGUAGE plpgsql; 