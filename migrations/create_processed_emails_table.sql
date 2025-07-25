-- Create processed_emails table to track which emails have been processed
-- This prevents the same emails from being processed repeatedly by the cron job

CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('skipped', 'lead_created', 'lead_creation_failed', 'no_lead_detected', 'error')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate processing of the same email by the same user
CREATE UNIQUE INDEX IF NOT EXISTS processed_emails_email_user_unique 
ON processed_emails(email_id, user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS processed_emails_user_id_idx 
ON processed_emails(user_id);

CREATE INDEX IF NOT EXISTS processed_emails_status_idx 
ON processed_emails(status);

CREATE INDEX IF NOT EXISTS processed_emails_processed_at_idx 
ON processed_emails(processed_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own processed emails
CREATE POLICY "Users can view their own processed emails" ON processed_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own processed emails
CREATE POLICY "Users can insert their own processed emails" ON processed_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for cron jobs)
CREATE POLICY "Service role can manage all processed emails" ON processed_emails
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE processed_emails IS 'Tracks which emails have been processed by the Gmail integration cron job to prevent duplicate processing';
COMMENT ON COLUMN processed_emails.email_id IS 'Gmail message ID of the processed email';
COMMENT ON COLUMN processed_emails.user_id IS 'User ID who owns the Gmail integration';
COMMENT ON COLUMN processed_emails.status IS 'Status of email processing: skipped, lead_created, lead_creation_failed, no_lead_detected, error';
COMMENT ON COLUMN processed_emails.processed_at IS 'Timestamp when the email was processed'; 