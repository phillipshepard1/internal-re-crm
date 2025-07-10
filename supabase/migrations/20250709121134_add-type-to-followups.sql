ALTER TABLE follow_ups ADD COLUMN type text NOT NULL DEFAULT 'call';

-- Round Robin Configuration
CREATE TABLE round_robin_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for efficient Round Robin queries
CREATE INDEX idx_round_robin_active_priority ON round_robin_config(is_active, priority);

-- Function to get next user in Round Robin
CREATE OR REPLACE FUNCTION get_next_round_robin_user()
RETURNS uuid AS $$
DECLARE
  next_user_id uuid;
BEGIN
  -- Get the user with the lowest priority among active users
  SELECT user_id INTO next_user_id
  FROM round_robin_config
  WHERE is_active = true
  ORDER BY priority ASC, created_at ASC
  LIMIT 1;
  
  -- If no active users found, return null
  IF next_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update the priority to move this user to the end of the queue
  UPDATE round_robin_config
  SET priority = (SELECT COALESCE(MAX(priority), 0) + 1 FROM round_robin_config WHERE is_active = true)
  WHERE user_id = next_user_id;
  
  RETURN next_user_id;
END;
$$ LANGUAGE plpgsql;
