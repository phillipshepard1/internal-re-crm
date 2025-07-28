-- Add AI analysis fields to processed_emails table
-- This migration adds fields to store AI analysis results from N8N

-- Add new columns for AI analysis
ALTER TABLE processed_emails 
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS processing_source TEXT DEFAULT 'cron' CHECK (processing_source IN ('cron', 'n8n', 'manual'));

-- Add index for AI confidence queries
CREATE INDEX IF NOT EXISTS idx_processed_emails_ai_confidence ON processed_emails(ai_confidence);

-- Add index for processing source
CREATE INDEX IF NOT EXISTS idx_processed_emails_source ON processed_emails(processing_source);

-- Add index for AI analysis JSON queries
CREATE INDEX IF NOT EXISTS idx_processed_emails_ai_analysis ON processed_emails USING GIN (ai_analysis);

-- Update existing records to have default processing source
UPDATE processed_emails 
SET processing_source = 'cron' 
WHERE processing_source IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN processed_emails.ai_confidence IS 'Confidence score from AI analysis (0.0 to 1.0)';
COMMENT ON COLUMN processed_emails.ai_analysis IS 'Full AI analysis result from N8N workflow';
COMMENT ON COLUMN processed_emails.processing_source IS 'Source of email processing (cron, n8n, manual)';

-- Create a view for AI processing statistics
CREATE OR REPLACE VIEW ai_processing_stats AS
SELECT 
  processing_source,
  COUNT(*) as total_processed,
  COUNT(CASE WHEN person_id IS NOT NULL THEN 1 END) as leads_created,
  COUNT(CASE WHEN person_id IS NULL THEN 1 END) as non_leads,
  AVG(ai_confidence) as avg_confidence,
  MIN(ai_confidence) as min_confidence,
  MAX(ai_confidence) as max_confidence,
  COUNT(CASE WHEN ai_confidence >= 0.8 THEN 1 END) as high_confidence_leads,
  COUNT(CASE WHEN ai_confidence >= 0.6 AND ai_confidence < 0.8 THEN 1 END) as medium_confidence_leads,
  COUNT(CASE WHEN ai_confidence < 0.6 THEN 1 END) as low_confidence_leads
FROM processed_emails 
WHERE ai_confidence IS NOT NULL
GROUP BY processing_source;

-- Create a function to get AI processing performance
CREATE OR REPLACE FUNCTION get_ai_processing_performance(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  processing_source TEXT,
  total_processed BIGINT,
  leads_created BIGINT,
  success_rate DECIMAL(5,2),
  avg_confidence DECIMAL(3,2),
  high_confidence_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.processing_source,
    ps.total_processed,
    ps.leads_created,
    CASE 
      WHEN ps.total_processed > 0 
      THEN ROUND((ps.leads_created::DECIMAL / ps.total_processed * 100), 2)
      ELSE 0 
    END as success_rate,
    ps.avg_confidence,
    CASE 
      WHEN ps.total_processed > 0 
      THEN ROUND((ps.high_confidence_leads::DECIMAL / ps.total_processed * 100), 2)
      ELSE 0 
    END as high_confidence_rate
  FROM ai_processing_stats ps
  WHERE ps.total_processed > 0
  ORDER BY ps.total_processed DESC;
END;
$$ LANGUAGE plpgsql; 