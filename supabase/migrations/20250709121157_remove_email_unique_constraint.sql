-- Remove unique constraint on email field to allow multiple leads with same email
-- This is needed for N8N processing where each email submission should create a new lead

-- Drop the unique constraint if it exists
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_email_unique;

-- Add a comment explaining why we removed the constraint
COMMENT ON TABLE people IS 'Email field is not unique to allow multiple leads from same email address (e.g., different form submissions)';