# Migration Instructions: Create processed_emails Table

## Step-by-Step Guide

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL
1. Copy the following SQL code:

```sql
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
```

2. Paste it into the SQL Editor
3. Click the **"Run"** button (or press Ctrl+Enter)

### Step 3: Verify the Migration
1. Go to **Table Editor** in the left sidebar
2. Look for the `processed_emails` table in the list
3. Click on it to see the table structure
4. Verify that all columns and indexes are present

### Step 4: Test the Table
You can run a quick test query to make sure the table works:

```sql
-- Test insert (this should work)
INSERT INTO processed_emails (email_id, user_id, status) 
VALUES ('test_email_123', '00000000-0000-0000-0000-000000000000', 'test');

-- Test select (this should return the test record)
SELECT * FROM processed_emails WHERE email_id = 'test_email_123';

-- Clean up test data
DELETE FROM processed_emails WHERE email_id = 'test_email_123';
```

## Troubleshooting

### If you get an error about "relation already exists"
- This means the table was already created
- You can skip the migration

### If you get an error about permissions
- Make sure you're using the service role key
- Check that your user has admin privileges in Supabase

### If you get an error about foreign key constraints
- Make sure the `users` table exists
- Verify that the `user_id` column in the `users` table is a UUID

## After Migration

Once the migration is complete:
1. Deploy your updated code
2. Test the cron job to ensure it's working properly
3. Monitor the logs to see the new processing behavior

The cron job should now:
- Check for already processed emails before processing
- Mark emails as processed after handling them
- Provide detailed logging about what's happening
- Prevent duplicate lead creation 