-- Create custom_lead_tabs table for storing user-defined lead filter tabs
CREATE TABLE IF NOT EXISTS custom_lead_tabs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('tag', 'status', 'source', 'custom')),
  filter_value TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  tab_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS custom_lead_tabs_user_id_idx ON custom_lead_tabs(user_id);
CREATE INDEX IF NOT EXISTS custom_lead_tabs_user_active_idx ON custom_lead_tabs(user_id, is_active);

-- Add unique constraint to prevent duplicate tab names per user
CREATE UNIQUE INDEX IF NOT EXISTS custom_lead_tabs_user_name_unique
ON custom_lead_tabs(user_id, name) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE custom_lead_tabs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own custom tabs
CREATE POLICY "Users can view their own custom tabs" ON custom_lead_tabs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own custom tabs
CREATE POLICY "Users can create their own custom tabs" ON custom_lead_tabs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own custom tabs
CREATE POLICY "Users can update their own custom tabs" ON custom_lead_tabs
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own custom tabs
CREATE POLICY "Users can delete their own custom tabs" ON custom_lead_tabs
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE custom_lead_tabs IS 'Stores user-defined custom tabs for filtering leads on the My Leads page';
COMMENT ON COLUMN custom_lead_tabs.user_id IS 'User who created the custom tab';
COMMENT ON COLUMN custom_lead_tabs.name IS 'Display name of the custom tab';
COMMENT ON COLUMN custom_lead_tabs.filter_type IS 'Type of filter: tag, status, source, or custom (notes search)';
COMMENT ON COLUMN custom_lead_tabs.filter_value IS 'The value to filter by based on filter_type';
COMMENT ON COLUMN custom_lead_tabs.color IS 'Hex color code for the tab visual indicator';
COMMENT ON COLUMN custom_lead_tabs.tab_order IS 'Order of tabs for display (lower numbers appear first)';
COMMENT ON COLUMN custom_lead_tabs.is_active IS 'Soft delete flag - false means tab is deleted';