-- Add cleanup_orphaned_followups function
-- Migration: 20250709121200_add_cleanup_orphaned_followups_function.sql

-- Create a function to clean up orphaned follow-ups
CREATE OR REPLACE FUNCTION cleanup_orphaned_followups()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete follow-ups where the person doesn't exist
  DELETE FROM follow_ups 
  WHERE person_id NOT IN (SELECT id FROM people);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 