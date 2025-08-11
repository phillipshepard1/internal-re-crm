-- Enable Row Level Security on all tables that are currently unrestricted
-- This migration enables RLS to secure tables from unauthorized access

-- Activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Follow up tables
ALTER TABLE follow_up_plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Lead detection tables
ALTER TABLE lead_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (allows Supabase service role full access)
-- These policies ensure the application can still function while securing against direct access

-- Activities policies
CREATE POLICY "Service role can manage activities" ON activities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view activities" ON activities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Files policies
CREATE POLICY "Service role can manage files" ON files
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view files" ON files
  FOR SELECT USING (auth.role() = 'authenticated');


-- Follow up plan steps policies
CREATE POLICY "Service role can manage follow_up_plan_steps" ON follow_up_plan_steps
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view follow_up_plan_steps" ON follow_up_plan_steps
  FOR SELECT USING (auth.role() = 'authenticated');

-- Follow up plan templates policies
CREATE POLICY "Service role can manage follow_up_plan_templates" ON follow_up_plan_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view follow_up_plan_templates" ON follow_up_plan_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Follow ups policies
CREATE POLICY "Service role can manage follow_ups" ON follow_ups
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view follow_ups" ON follow_ups
  FOR SELECT USING (auth.role() = 'authenticated');

-- Lead detection rules policies
CREATE POLICY "Service role can manage lead_detection_rules" ON lead_detection_rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view lead_detection_rules" ON lead_detection_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- Lead sources policies
CREATE POLICY "Service role can manage lead_sources" ON lead_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view lead_sources" ON lead_sources
  FOR SELECT USING (auth.role() = 'authenticated');

-- Lead tags policies
CREATE POLICY "Service role can manage lead_tags" ON lead_tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view lead_tags" ON lead_tags
  FOR SELECT USING (auth.role() = 'authenticated');