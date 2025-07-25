# Email Processing Duplicate Issue Fix

## Problem
The cron job was creating duplicate leads because it was processing the same emails repeatedly. Every time the cron job ran, it would fetch the same 20 most recent emails from Gmail and try to create leads for them, even if they had already been processed.

## Root Cause
1. **No tracking mechanism**: There was no way to track which emails had already been processed
2. **Gmail API behavior**: The `/messages` endpoint always returns the most recent emails
3. **Duplicate detection only**: The system only checked for existing people by email, but didn't prevent reprocessing the same email

## Solution
Implemented email processing tracking using a new `processed_emails` table.

### Changes Made

#### 1. Database Schema
Created a new table `processed_emails` to track processed emails:

```sql
CREATE TABLE processed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('skipped', 'lead_created', 'lead_creation_failed', 'no_lead_detected', 'error')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Gmail Integration Updates
- Added `hasEmailBeenProcessed()` method to check if an email was already processed
- Added `markEmailAsProcessed()` method to mark emails as processed
- Added `cleanupOldProcessedEmails()` method to remove old records (30+ days)
- Updated `processRecentEmails()` to check for already processed emails before processing

#### 3. Processing Flow
The new flow is:
1. Get recent emails from Gmail
2. For each email, check if it's already been processed
3. If processed, skip it
4. If not processed, attempt to create a lead
5. Mark the email as processed regardless of outcome (to prevent infinite retries)
6. Clean up old processed email records

## Implementation Steps

### Step 1: Run the Migration
Execute the SQL migration in your Supabase dashboard:

```sql
-- Copy and paste the contents of migrations/create_processed_emails_table.sql
```

Or run the migration script:
```bash
node scripts/run-migration.js
```

### Step 2: Deploy the Code Changes
The Gmail integration code has been updated with the new tracking logic.

### Step 3: Test the Fix
1. Run the cron job manually
2. Check the logs to see the new processing summary
3. Verify that the same emails are not processed repeatedly

## Expected Behavior After Fix

### Before Fix:
```
Email processing completed: 5 leads processed from 1 users
Error creating person: duplicate key value violates unique constraint "people_email_unique"
Error creating person: duplicate key value violates unique constraint "people_email_unique"
Error creating person: duplicate key value violates unique constraint "people_email_unique"
```

### After Fix:
```
Processing 20 recent emails for user abc123
Email 18c1234567890 already processed, skipping
Email 18c1234567891 already processed, skipping
Skipping email from noreply@example.com: Newsletter
Email processing summary for user abc123: 2 leads created, 3 skipped, 15 already processed
Email processing completed: 2 leads processed from 1 users
```

## Benefits
1. **No more duplicate leads**: Each email is only processed once
2. **Better logging**: Clear visibility into what's happening during processing
3. **Automatic cleanup**: Old records are automatically removed
4. **Error handling**: Failed processing attempts are tracked to prevent infinite retries
5. **Performance**: Faster processing as already-processed emails are skipped immediately

## Monitoring
You can monitor the processing by checking:
- The `processed_emails` table in your database
- The cron job logs for processing summaries
- The `activities` table for lead creation events

## Troubleshooting
If you still see duplicate leads after implementing this fix:
1. Check if the migration was run successfully
2. Verify the `processed_emails` table exists
3. Check the cron job logs for any errors
4. Ensure the service role has proper permissions 