export interface LeadSource {
  id: string
  name: string
  description?: string
  email_patterns: string[]
  domain_patterns: string[]
  keywords: string[]
  is_default: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LeadDetectionRule {
  id: string
  name: string
  description?: string
  conditions: LeadDetectionConditions
  confidence_score: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LeadDetectionConditions {
  subject_keywords?: string[]
  body_keywords?: string[]
  sender_patterns?: string[]
  domain_patterns?: string[]
  min_confidence?: number
  required_fields?: string[]
  exclude_patterns?: string[]
}

export interface EmailAnalysisResult {
  is_lead: boolean
  confidence_score: number
  detected_source?: LeadSource
  detected_rule?: LeadDetectionRule
  extracted_data: {
    name?: string
    email?: string[]
    phone?: string[]
    company?: string
    position?: string
    message?: string
    property_address?: string
    property_details?: string
  }
  reasons: string[]
}

export interface LeadExtractionResult {
  success: boolean
  lead_data?: {
    first_name: string
    last_name: string
    email: string[]
    phone: string[]
    company?: string
    position?: string
    message?: string
    property_address?: string
    property_details?: string
    lead_source: string
    lead_source_id?: string
    confidence_score: number
  }
  analysis_result?: EmailAnalysisResult
  error?: string
} 