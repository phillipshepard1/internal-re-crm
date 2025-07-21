-- Add SSO-specific fields to integration_configs table
ALTER TABLE integration_configs 
ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sso_api_key TEXT,
ADD COLUMN IF NOT EXISTS sso_base_url TEXT DEFAULT 'https://bkapi.homestack.com',
ADD COLUMN IF NOT EXISTS sso_broker_url TEXT DEFAULT 'https://broker.homestack.com';

-- Update existing HomeStack config to include SSO fields
UPDATE integration_configs 
SET 
  sso_enabled = false,
  sso_api_key = NULL,
  sso_base_url = 'https://bkapi.homestack.com',
  sso_broker_url = 'https://broker.homestack.com'
WHERE integration_type = 'homestack'; 