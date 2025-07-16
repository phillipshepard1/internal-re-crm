-- Create lead_sources table for managing lead source configurations
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  email_patterns TEXT[], -- Array of email patterns to match (e.g., ['noreply@leadsource.com', '*@zillow.com'])
  domain_patterns TEXT[], -- Array of domain patterns to match
  keywords TEXT[], -- Array of keywords that indicate this is a lead source
  is_default BOOLEAN DEFAULT false, -- Whether this is a system default
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lead_sources_active ON lead_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_lead_sources_default ON lead_sources(is_default);

-- Insert default lead sources
INSERT INTO lead_sources (name, description, email_patterns, domain_patterns, keywords, is_default, is_active) VALUES
('Zillow', 'Leads from Zillow.com', ARRAY['noreply@zillow.com', 'leads@zillow.com'], ARRAY['zillow.com'], ARRAY['zillow', 'property inquiry', 'home inquiry'], true, true),
('Realtor.com', 'Leads from Realtor.com', ARRAY['noreply@realtor.com', 'leads@realtor.com'], ARRAY['realtor.com'], ARRAY['realtor', 'property inquiry', 'home inquiry'], true, true),
('HomeStack', 'Leads from HomeStack', ARRAY['noreply@homestack.com', 'leads@homestack.com'], ARRAY['homestack.com'], ARRAY['homestack', 'property inquiry'], true, true),
('Website Form', 'Leads from website contact forms', ARRAY['noreply@yourdomain.com', 'contact@yourdomain.com'], ARRAY['yourdomain.com'], ARRAY['contact form', 'inquiry', 'property interest'], true, true),
('Referral', 'Referral leads', ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY['referral', 'referred by'], true, true),
('Social Media', 'Leads from social media', ARRAY[]::TEXT[], ARRAY['facebook.com', 'instagram.com', 'linkedin.com'], ARRAY['social media', 'facebook', 'instagram', 'linkedin'], true, true),
('Cold Outreach', 'Cold outreach leads', ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY['cold', 'outreach', 'prospecting'], true, true);

-- Create lead_detection_rules table for AI-powered lead detection
CREATE TABLE IF NOT EXISTS lead_detection_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- JSON object with detection conditions
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- Confidence score (0.0 to 1.0)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for lead detection rules
CREATE INDEX IF NOT EXISTS idx_lead_detection_rules_active ON lead_detection_rules(is_active);

-- Insert default lead detection rules
INSERT INTO lead_detection_rules (name, description, conditions, confidence_score, is_active) VALUES
('Property Inquiry', 'Detects emails asking about properties', 
  '{"subject_keywords": ["property", "house", "home", "listing", "inquiry", "interest"], "body_keywords": ["interested", "property", "house", "home", "viewing", "schedule"], "min_confidence": 0.7}', 
  0.8, true),
('Investment Interest', 'Detects emails about investment properties', 
  '{"subject_keywords": ["investment", "investor", "rental", "income"], "body_keywords": ["investment", "investor", "rental", "income", "return"], "min_confidence": 0.7}', 
  0.8, true),
('Selling Interest', 'Detects emails from people wanting to sell', 
  '{"subject_keywords": ["sell", "selling", "market", "value"], "body_keywords": ["sell", "selling", "market", "value", "appraisal"], "min_confidence": 0.7}', 
  0.8, true),
('General Inquiry', 'Detects general real estate inquiries', 
  '{"subject_keywords": ["real estate", "agent", "help", "question"], "body_keywords": ["real estate", "agent", "help", "question", "information"], "min_confidence": 0.6}', 
  0.6, true);

-- Add lead_source_id to people table for tracking which lead source generated the lead
ALTER TABLE people ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL;

-- Create index for lead source tracking
CREATE INDEX IF NOT EXISTS idx_people_lead_source_id ON people(lead_source_id); 