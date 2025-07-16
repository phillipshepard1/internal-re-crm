-- Create user_gmail_tokens table for storing user-specific Gmail OAuth tokens
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  gmail_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to ensure one active token per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gmail_tokens_user_id_active 
ON user_gmail_tokens(user_id) WHERE is_active = true;

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_user_gmail_tokens_user_id ON user_gmail_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gmail_tokens_gmail_email ON user_gmail_tokens(gmail_email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_gmail_tokens_updated_at 
    BEFORE UPDATE ON user_gmail_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 