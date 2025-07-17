-- Create integration_configs table for storing API keys and configuration
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  base_url TEXT,
  webhook_secret TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write integration configs
CREATE POLICY "Admins can manage integration configs" ON integration_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_enabled ON integration_configs(enabled);

-- Insert default HomeStack config (disabled)
INSERT INTO integration_configs (integration_type, api_key, base_url, enabled)
VALUES ('homestack', '', 'https://api.homestack.com', false)
ON CONFLICT (integration_type) DO NOTHING; 