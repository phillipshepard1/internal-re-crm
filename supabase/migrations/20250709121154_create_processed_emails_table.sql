-- Create processed_emails table to track which emails have been processed
CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT NOT NULL, -- Gmail message ID
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL, -- NULL if not a lead
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  gmail_email TEXT, -- The Gmail address this email was processed for
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processed_emails_email_id ON processed_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_user_id ON processed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at ON processed_emails(processed_at);
CREATE INDEX IF NOT EXISTS idx_processed_emails_gmail_email ON processed_emails(gmail_email);

-- Create unique constraint to prevent duplicate processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_emails_unique ON processed_emails(email_id, user_id); 