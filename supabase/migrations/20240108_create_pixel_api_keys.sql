-- Create table for pixel API keys
CREATE TABLE IF NOT EXISTS pixel_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  leads_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster key lookups
CREATE INDEX idx_pixel_api_keys_key ON pixel_api_keys(key);
CREATE INDEX idx_pixel_api_keys_active ON pixel_api_keys(is_active);

-- Enable RLS
ALTER TABLE pixel_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage API keys" ON pixel_api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create table for pixel captures (optional tracking)
CREATE TABLE IF NOT EXISTS pixel_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES people(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES pixel_api_keys(id) ON DELETE SET NULL,
  source_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_data JSONB
);

-- Create index for analytics
CREATE INDEX idx_pixel_captures_api_key ON pixel_captures(api_key_id);
CREATE INDEX idx_pixel_captures_captured_at ON pixel_captures(captured_at);

-- Enable RLS for pixel_captures
ALTER TABLE pixel_captures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pixel_captures
CREATE POLICY "Admins can view pixel captures" ON pixel_captures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to increment leads count for an API key
CREATE OR REPLACE FUNCTION increment_api_key_leads_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE pixel_api_keys
    SET 
      leads_count = leads_count + 1,
      last_used = NOW()
    WHERE id = NEW.api_key_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update leads count
CREATE TRIGGER update_api_key_stats
AFTER INSERT ON pixel_captures
FOR EACH ROW
EXECUTE FUNCTION increment_api_key_leads_count();