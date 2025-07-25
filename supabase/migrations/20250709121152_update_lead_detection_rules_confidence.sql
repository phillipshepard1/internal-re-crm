-- Update lead detection rules to have lower minimum confidence thresholds
-- Migration: 20250709121152_update_lead_detection_rules_confidence.sql

-- Update Property Inquiry rule
UPDATE lead_detection_rules 
SET conditions = '{"subject_keywords": ["property", "house", "home", "listing", "inquiry", "interest"], "body_keywords": ["interested", "property", "house", "home", "viewing", "schedule"], "min_confidence": 0.3}'
WHERE name = 'Property Inquiry';

-- Update Investment Interest rule
UPDATE lead_detection_rules 
SET conditions = '{"subject_keywords": ["investment", "investor", "rental", "income"], "body_keywords": ["investment", "investor", "rental", "income", "return"], "min_confidence": 0.3}'
WHERE name = 'Investment Interest';

-- Update Selling Interest rule
UPDATE lead_detection_rules 
SET conditions = '{"subject_keywords": ["sell", "selling", "market", "value"], "body_keywords": ["sell", "selling", "market", "value", "appraisal"], "min_confidence": 0.3}'
WHERE name = 'Selling Interest';

-- Update General Inquiry rule
UPDATE lead_detection_rules 
SET conditions = '{"subject_keywords": ["real estate", "agent", "help", "question"], "body_keywords": ["real estate", "agent", "help", "question", "information"], "min_confidence": 0.3}'
WHERE name = 'General Inquiry'; 