-- Migration to add all existing agent users to round_robin_config table
-- This migration will populate the round_robin_config table with all agent users

-- Insert all agent users into round_robin_config
INSERT INTO round_robin_config (user_id, is_active, priority, created_at, updated_at)
SELECT 
  id as user_id,
  true as is_active,
  ROW_NUMBER() OVER (ORDER BY created_at) as priority,
  created_at,
  updated_at
FROM users 
WHERE role = 'agent'
  AND id NOT IN (SELECT user_id FROM round_robin_config);

-- Add a comment to document this migration
COMMENT ON TABLE round_robin_config IS 'Round Robin configuration populated with all agent users on 2025-07-14'; 