-- Fix ambiguous column reference in check_and_create_missed_followups function
-- Migration: 20250805000001_fix_missed_followups_ambiguity.sql

-- Drop and recreate the function with fixed column references
DROP FUNCTION IF EXISTS check_and_create_missed_followups();

CREATE OR REPLACE FUNCTION check_and_create_missed_followups()
RETURNS INTEGER AS $$
DECLARE
  person_record RECORD;
  followup_count INTEGER := 0;
  current_week_start DATE;
  current_week_end DATE;
  last_followup_date DATE;
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
    GROUP BY p.id
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