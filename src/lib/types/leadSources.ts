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