-- Add lead tags and follow-up plan templates
-- Migration: 20250709121148_add_lead_tags_and_followup_plans.sql

-- Create lead_tags table for Hot/Warm/Cold/Dead system
CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default lead tags
INSERT INTO lead_tags (name, color, description) VALUES
('Hot', '#EF4444', 'High priority leads that need immediate attention'),
('Warm', '#F59E0B', 'Medium priority leads with good potential'),
('Cold', '#6B7280', 'Low priority leads that need nurturing'),
('Dead', '#374151', 'Leads that are no longer viable')
ON CONFLICT (name) DO NOTHING;

-- Create follow_up_plan_templates table
CREATE TABLE IF NOT EXISTS follow_up_plan_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create follow_up_plan_steps table for individual steps in a plan
CREATE TABLE IF NOT EXISTS follow_up_plan_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES follow_up_plan_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  days_after_assignment INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add lead_tag_id to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS lead_tag_id UUID REFERENCES lead_tags(id) ON DELETE SET NULL;

-- Add follow_up_plan_id to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS follow_up_plan_id UUID REFERENCES follow_up_plan_templates(id) ON DELETE SET NULL;

-- Add assigned_by to people table to track who assigned the lead
ALTER TABLE people ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add assigned_at to people table to track when the lead was assigned
ALTER TABLE people ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_people_lead_tag_id ON people(lead_tag_id);
CREATE INDEX IF NOT EXISTS idx_people_follow_up_plan_id ON people(follow_up_plan_id);
CREATE INDEX IF NOT EXISTS idx_people_assigned_by ON people(assigned_by);
CREATE INDEX IF NOT EXISTS idx_follow_up_plan_steps_plan_id ON follow_up_plan_steps(plan_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_plan_steps_order ON follow_up_plan_steps(plan_id, step_order);

-- Insert default follow-up plan templates
INSERT INTO follow_up_plan_templates (name, description) VALUES
('7-Day Contact Plan', 'Aggressive follow-up plan for hot leads'),
('Long-Term Nurture Plan', 'Gentle nurturing plan for warm leads'),
('Cold Lead Re-engagement', 'Plan to re-engage cold leads'),
('Standard Follow-up', 'Default follow-up plan for new leads')
ON CONFLICT DO NOTHING;

-- Get the plan IDs for inserting steps
DO $$
DECLARE
  seven_day_plan_id UUID;
  nurture_plan_id UUID;
  cold_plan_id UUID;
  standard_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO seven_day_plan_id FROM follow_up_plan_templates WHERE name = '7-Day Contact Plan';
  SELECT id INTO nurture_plan_id FROM follow_up_plan_templates WHERE name = 'Long-Term Nurture Plan';
  SELECT id INTO cold_plan_id FROM follow_up_plan_templates WHERE name = 'Cold Lead Re-engagement';
  SELECT id INTO standard_plan_id FROM follow_up_plan_templates WHERE name = 'Standard Follow-up';

  -- Insert steps for 7-Day Contact Plan
  INSERT INTO follow_up_plan_steps (plan_id, step_order, type, title, description, days_after_assignment, notes) VALUES
  (seven_day_plan_id, 1, 'call', 'Initial Contact Call', 'Make first contact call to introduce yourself and understand their needs', 1, 'Focus on building rapport and understanding their timeline'),
  (seven_day_plan_id, 2, 'email', 'Follow-up Email', 'Send personalized follow-up email with relevant information', 2, 'Include market insights or property recommendations'),
  (seven_day_plan_id, 3, 'call', 'Progress Check Call', 'Check in on their progress and answer any questions', 4, 'Be prepared to address concerns and objections'),
  (seven_day_plan_id, 4, 'meeting', 'Property Viewing Setup', 'Schedule property viewing or consultation meeting', 7, 'Have multiple options ready to show them');

  -- Insert steps for Long-Term Nurture Plan
  INSERT INTO follow_up_plan_steps (plan_id, step_order, type, title, description, days_after_assignment, notes) VALUES
  (nurture_plan_id, 1, 'email', 'Welcome Email', 'Send welcome email with market insights', 1, 'Provide value without being pushy'),
  (nurture_plan_id, 2, 'email', 'Market Update', 'Share monthly market update and trends', 7, 'Keep them informed about market conditions'),
  (nurture_plan_id, 3, 'call', 'Check-in Call', 'Friendly check-in call to maintain relationship', 14, 'Focus on relationship building'),
  (nurture_plan_id, 4, 'email', 'Property Alert', 'Send personalized property alerts', 21, 'Match their criteria and budget');

  -- Insert steps for Cold Lead Re-engagement
  INSERT INTO follow_up_plan_steps (plan_id, step_order, type, title, description, days_after_assignment, notes) VALUES
  (cold_plan_id, 1, 'email', 'Re-engagement Email', 'Send re-engagement email with new market insights', 1, 'Provide fresh value to re-engage'),
  (cold_plan_id, 2, 'call', 'Courtesy Call', 'Make a courtesy call to check if they''re still interested', 3, 'Be respectful of their time'),
  (cold_plan_id, 3, 'email', 'Market Opportunity', 'Share specific market opportunities', 7, 'Highlight unique opportunities');

  -- Insert steps for Standard Follow-up
  INSERT INTO follow_up_plan_steps (plan_id, step_order, type, title, description, days_after_assignment, notes) VALUES
  (standard_plan_id, 1, 'call', 'Initial Contact', 'Make initial contact to understand their needs', 1, 'Focus on understanding their requirements'),
  (standard_plan_id, 2, 'email', 'Follow-up', 'Send follow-up email with next steps', 3, 'Provide clear next steps'),
  (standard_plan_id, 3, 'call', 'Progress Update', 'Check progress and provide updates', 7, 'Keep them informed of progress');

END $$;

-- Add trigger to update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_lead_tags_updated_at ON lead_tags;
CREATE TRIGGER update_lead_tags_updated_at 
  BEFORE UPDATE ON lead_tags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_up_plan_templates_updated_at ON follow_up_plan_templates;
CREATE TRIGGER update_follow_up_plan_templates_updated_at 
  BEFORE UPDATE ON follow_up_plan_templates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_up_plan_steps_updated_at ON follow_up_plan_steps;
CREATE TRIGGER update_follow_up_plan_steps_updated_at 
  BEFORE UPDATE ON follow_up_plan_steps 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 