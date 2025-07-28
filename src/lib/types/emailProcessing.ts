export interface EmailProcessingRequest {
  emailData: {
    from: string
    subject: string
    body: string
    to?: string
    date?: string
  }
  userId: string
  aiAnalysis?: {
    is_lead: boolean
    confidence: number
    lead_data: {
      first_name: string
      last_name: string
      email: string[]
      phone: string[]
      company?: string
      position?: string
      property_address?: string
      property_details?: string
      price_range?: string
      property_type?: string
      timeline?: string
      message?: string
      lead_source?: string
      urgency?: 'high' | 'medium' | 'low'
    }
    analysis: {
      intent: 'buying' | 'selling' | 'investing' | 'general_inquiry'
      property_type: 'residential' | 'commercial' | 'land'
      budget_range?: string
      location_preferences?: string[]
    }
  }
}

export interface EmailProcessingResult {
  success: boolean
  message: string
  person?: any
  analysis?: {
    confidence: number
    reasons: string[]
    source: string
    extracted_fields?: string[]
  }
  error?: string
  details?: string
} 