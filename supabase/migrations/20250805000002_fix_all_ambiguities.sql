-- Fix all ambiguous column references in follow-up functions
-- Migration: 20250805000002_fix_all_ambiguities.sql

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS create_next_followup_for_person(UUID);
DROP FUNCTION IF EXISTS check_and_create_missed_followups();

-- Recreate create_next_followup_for_person with fixed parameter name
CREATE OR REPLACE FUNCTION create_next_followup_for_person(p_person_id UUID)
RETURNS UUID AS $$
DECLARE
  person_record RECORD;
  next_date DATE;
  new_followup_id UUID;
  current_week_start DATE;
  current_week_end DATE;
  has_current_week_followup BOOLEAN;
  last_completed_followup RECORD;
BEGIN
  -- Get person's follow-up settings
  SELECT 
    p.follow_up_frequency,
    p.follow_up_day_of_week,
    p.last_follow_up_date,
    p.assigned_to
  INTO person_record
  FROM people p
  WHERE p.id = p_person_id;

  -- If no frequency set, don't create follow-up
  IF person_record.follow_up_frequency IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate current week boundaries (Monday to Sunday)
  current_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1;
  current_week_end := current_week_start + 6;

  -- Check if there's already a follow-up scheduled for this week
  SELECT EXISTS (
    SELECT 1 FROM follow_ups fu 
    WHERE fu.person_id = p_person_id 
    AND fu.status = 'pending'
    AND fu.scheduled_date >= current_week_start 
    AND fu.scheduled_date <= current_week_end
  ) INTO has_current_week_followup;

  -- If there's already a follow-up for this week, don't create another
  IF has_current_week_followup THEN
    RETURN NULL;
  END IF;

  -- Get the last completed follow-up to determine the base date
  SELECT fu.scheduled_date 
  INTO last_completed_followup
  FROM follow_ups fu
  WHERE fu.person_id = p_person_id 
  AND fu.status = 'completed'
  ORDER BY fu.scheduled_date DESC 
  LIMIT 1;

  -- For missed follow-ups: if they should have had a follow-up this week based on frequency,
  -- schedule it for the current week instead of next occurrence
  IF person_record.follow_up_frequency IN ('twice_week', 'weekly') THEN
    -- For twice a week or weekly, always ensure current week has a follow-up
    next_date := calculate_next_followup_date_for_current_week(
      person_record.follow_up_frequency,
      person_record.follow_up_day_of_week
    );
  ELSE
    -- For biweekly and monthly, calculate normally
    next_date := calculate_next_followup_date(
      person_record.follow_up_frequency,
      person_record.follow_up_day_of_week,
      COALESCE(last_completed_followup.scheduled_date, person_record.last_follow_up_date)
    );
    
    -- If the calculated date is in the past, reschedule for current week
    IF next_date < CURRENT_DATE THEN
      next_date := calculate_next_followup_date_for_current_week(
        person_record.follow_up_frequency,
        person_record.follow_up_day_of_week
      );
    END IF;
  END IF;

  -- Create the follow-up
  INSERT INTO follow_ups (
    person_id,
    scheduled_date,
    status,
    type,
    notes,
    assigned_to
  ) VALUES (
    p_person_id,
    next_date::TIMESTAMP WITH TIME ZONE,
    'pending',
    'call',
    'Automated follow-up based on frequency schedule',
    person_record.assigned_to
  ) RETURNING id INTO new_followup_id;

  -- Update the person's last follow-up date
  UPDATE people 
  SET last_follow_up_date = next_date::TIMESTAMP WITH TIME ZONE
  WHERE id = p_person_id;

  RETURN new_followup_id;
END;
$$ LANGUAGE plpgsql;

-- Recreate check_and_create_missed_followups with fixed references
CREATE OR REPLACE FUNCTION check_and_create_missed_followups()
RETURNS INTEGER AS $$
DECLARE
  person_record RECORD;
  followup_count INTEGER := 0;
  current_week_start DATE;
  current_week_end DATE;
  should_have_followup BOOLEAN;
BEGIN
  -- Calculate current week boundaries
  current_week_start := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1;
  current_week_end := current_week_start + 6;

  -- Find all people who might have missed follow-ups
  FOR person_record IN 
    SELECT 
      p.id as person_id,
      p.follow_up_frequency,
      p.follow_up_day_of_week,
      p.assigned_to,
      MAX(fu.scheduled_date) as last_scheduled_date
    FROM people p
    LEFT JOIN follow_ups fu ON fu.person_id = p.id AND fu.status = 'completed'
    WHERE 
      p.follow_up_frequency IS NOT NULL
      AND p.assigned_to IS NOT NULL
      AND NOT EXISTS (
        -- No pending follow-up for current week
        SELECT 1 FROM follow_ups fu2 
        WHERE fu2.person_id = p.id 
        AND fu2.status = 'pending'
        AND fu2.scheduled_date >= current_week_start
        AND fu2.scheduled_date <= current_week_end
      )
    GROUP BY p.id, p.follow_up_frequency, p.follow_up_day_of_week, p.assigned_to
  LOOP
    should_have_followup := FALSE;
    
    -- Determine if they should have a follow-up this week based on frequency
    CASE person_record.follow_up_frequency
      WHEN 'twice_week' THEN
        should_have_followup := TRUE; -- Always need follow-ups
        
      WHEN 'weekly' THEN
        should_have_followup := TRUE; -- Always need follow-ups
        
      WHEN 'biweekly' THEN
        -- Check if it's been 2 weeks since last follow-up
        IF person_record.last_scheduled_date IS NULL OR 
           (CURRENT_DATE - person_record.last_scheduled_date::DATE) >= 14 THEN
          should_have_followup := TRUE;
        END IF;
        
      WHEN 'monthly' THEN
        -- Check if it's been a month since last follow-up
        IF person_record.last_scheduled_date IS NULL OR 
           (CURRENT_DATE - person_record.last_scheduled_date::DATE) >= 28 THEN
          should_have_followup := TRUE;
        END IF;
    END CASE;
    
    -- If they should have a follow-up, create one for current week
    IF should_have_followup THEN
      PERFORM create_next_followup_for_person(person_record.person_id);
      followup_count := followup_count + 1;
    END IF;
  END LOOP;

  RETURN followup_count;
END;
$$ LANGUAGE plpgsql;