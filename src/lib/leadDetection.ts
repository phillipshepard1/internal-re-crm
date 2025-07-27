import type { 
  LeadSource, 
  LeadDetectionRule, 
  EmailAnalysisResult, 
  LeadExtractionResult,
  LeadDetectionConditions 
} from './types/leadSources'

// Only create Supabase client on server side
let supabase: any = null

async function getSupabaseClient() {
  if (typeof window === 'undefined' && !supabase) {
    // Server-side only
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return supabase
}

export class LeadDetectionService {
  
  /**
   * Analyze an email to determine if it's a lead
   */
  static async analyzeEmail(
    emailData: {
      from: string
      subject: string
      body: string
      to?: string
      date?: string
    }
  ): Promise<EmailAnalysisResult> {
    try {
      const { from, subject, body } = emailData
      
      // Get all active lead sources and detection rules
      const [leadSources, detectionRules] = await Promise.all([
        this.getActiveLeadSources(),
        this.getActiveDetectionRules()
      ])
      
      let maxConfidence = 0
      let detectedSource: LeadSource | undefined
      let detectedRule: LeadDetectionRule | undefined
      const reasons: string[] = []
      
      // Check against lead sources first
      for (const source of leadSources) {
        const sourceConfidence = this.calculateSourceConfidence(from, subject, body, source)
        if (sourceConfidence > maxConfidence) {
          maxConfidence = sourceConfidence
          detectedSource = source
          reasons.push(`Matched lead source: ${source.name}`)
        }
      }
      
      // Check against detection rules
      for (const rule of detectionRules) {
        const ruleConfidence = this.calculateRuleConfidence(from, subject, body, rule)
        if (ruleConfidence > maxConfidence) {
          maxConfidence = ruleConfidence
          detectedRule = rule
          reasons.push(`Matched detection rule: ${rule.name}`)
        }
      }
      
      // Extract data from email
      const extractedData = this.extractContactData(from, subject, body)
      
      // Determine if this is a lead based on confidence threshold
      const isLead = maxConfidence >= 0.6 // Minimum 60% confidence
      
      if (isLead) {
        reasons.push(`High confidence score: ${(maxConfidence * 100).toFixed(1)}%`)
      } else {
        reasons.push(`Low confidence score: ${(maxConfidence * 100).toFixed(1)}%`)
      }
      
      return {
        is_lead: isLead,
        confidence_score: maxConfidence,
        detected_source: detectedSource,
        detected_rule: detectedRule,
        extracted_data: extractedData,
        reasons
      }
      
    } catch (error) {
      return {
        is_lead: false,
        confidence_score: 0,
        extracted_data: {},
        reasons: ['Error during analysis']
      }
    }
  }
  
  /**
   * Extract lead data from email analysis
   */
  static async extractLeadData(
    emailData: {
      from: string
      subject: string
      body: string
      to?: string
      date?: string
    }
  ): Promise<LeadExtractionResult> {
    try {
      const analysis = await this.analyzeEmail(emailData)
      
      if (!analysis.is_lead) {
        return {
          success: false,
          error: 'Email does not appear to be a lead',
          analysis_result: analysis
        }
      }
      
      const { extracted_data, detected_source, confidence_score } = analysis
      
      // Parse name from email or body
      const name = this.parseName(extracted_data.name || emailData.from)
      
      // Extract email addresses
      const emails = this.extractEmails(emailData.body, emailData.from)
      
      // Extract phone numbers
      const phones = this.extractPhoneNumbers(emailData.body)
      
      // Extract property information
      const propertyAddress = this.extractPropertyAddress(emailData.subject, emailData.body)
      const propertyDetails = this.extractPropertyDetails(emailData.subject, emailData.body)
      const priceRange = this.extractPriceRange(emailData.subject, emailData.body)
      const propertyType = this.extractPropertyType(emailData.subject, emailData.body)
      const locationPreferences = this.extractLocationPreferences(emailData.subject, emailData.body)
      const timeline = this.extractTimeline(emailData.subject, emailData.body)
      
      const leadData = {
        first_name: name.firstName,
        last_name: name.lastName,
        email: emails,
        phone: phones,
        company: extracted_data.company,
        position: extracted_data.position,
        message: extracted_data.message || emailData.body.substring(0, 500),
        property_address: propertyAddress,
        property_details: propertyDetails,
        price_range: priceRange || undefined,
        property_type: propertyType || undefined,
        location_preferences: locationPreferences || undefined,
        timeline: timeline || undefined,
        lead_source: detected_source?.name || 'Email',
        lead_source_id: detected_source?.id,
        confidence_score
      }
      
      return {
        success: true,
        lead_data: leadData,
        analysis_result: analysis
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Calculate confidence score for a lead source match
   */
  private static calculateSourceConfidence(
    from: string, 
    subject: string, 
    body: string, 
    source: LeadSource
  ): number {
    let confidence = 0
    const fromLower = from.toLowerCase()
    const subjectLower = subject.toLowerCase()
    const bodyLower = body.toLowerCase()
    
    // Check email patterns
    for (const pattern of source.email_patterns) {
      if (this.matchesPattern(fromLower, pattern)) {
        confidence += 0.4
        break
      }
    }
    
    // Check domain patterns
    for (const pattern of source.domain_patterns) {
      if (this.matchesPattern(fromLower, pattern)) {
        confidence += 0.3
        break
      }
    }
    
    // Check keywords in subject and body
    for (const keyword of source.keywords) {
      const keywordLower = keyword.toLowerCase()
      if (subjectLower.includes(keywordLower)) {
        confidence += 0.2
      }
      if (bodyLower.includes(keywordLower)) {
        confidence += 0.1
      }
    }
    
    return Math.min(confidence, 1.0)
  }
  
  /**
   * Calculate confidence score for a detection rule match
   */
  private static calculateRuleConfidence(
    from: string, 
    subject: string, 
    body: string, 
    rule: LeadDetectionRule
  ): number {
    let confidence = 0
    const conditions = rule.conditions
    const fromLower = from.toLowerCase()
    const subjectLower = subject.toLowerCase()
    const bodyLower = body.toLowerCase()
    
    // Check subject keywords
    if (conditions.subject_keywords) {
      for (const keyword of conditions.subject_keywords) {
        if (subjectLower.includes(keyword.toLowerCase())) {
          confidence += 0.3
        }
      }
    }
    
    // Check body keywords
    if (conditions.body_keywords) {
      for (const keyword of conditions.body_keywords) {
        if (bodyLower.includes(keyword.toLowerCase())) {
          confidence += 0.2
        }
      }
    }
    
    // Check sender patterns
    if (conditions.sender_patterns) {
      for (const pattern of conditions.sender_patterns) {
        if (this.matchesPattern(fromLower, pattern)) {
          confidence += 0.2
        }
      }
    }
    
    // Check domain patterns
    if (conditions.domain_patterns) {
      for (const pattern of conditions.domain_patterns) {
        if (this.matchesPattern(fromLower, pattern)) {
          confidence += 0.2
        }
      }
    }
    
    // Apply minimum confidence threshold
    const minConfidence = conditions.min_confidence || 0.5
    if (confidence < minConfidence) {
      confidence = 0
    }
    
    return Math.min(confidence, 1.0)
  }
  
  /**
   * Check if text matches a pattern (supports wildcards)
   */
  private static matchesPattern(text: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*')
      const regex = new RegExp(regexPattern, 'i')
      return regex.test(text)
    }
    return text.includes(pattern.toLowerCase())
  }
  
  /**
   * Extract contact data from email
   */
  private static extractContactData(from: string, subject: string, body: string) {
    return {
      name: this.extractName(from, body),
      email: this.extractEmails(body, from),
      phone: this.extractPhoneNumbers(body),
      company: this.extractCompany(body),
      position: this.extractPosition(body),
      message: body.substring(0, 1000), // First 1000 characters
      property_address: this.extractPropertyAddress(subject, body),
      property_details: this.extractPropertyDetails(subject, body)
    }
  }
  
  /**
   * Parse name from email or body
   */
  private static parseName(nameString: string): { firstName: string; lastName: string } {
    const cleanName = nameString.replace(/[<>"']/g, '').trim()
    
    // Try to extract from email format: "John Doe <john@example.com>"
    const emailMatch = cleanName.match(/^"?([^<]+)"?\s*</)
    if (emailMatch) {
      const fullName = emailMatch[1].trim()
      const parts = fullName.split(' ')
      return {
        firstName: parts[0] || 'Unknown',
        lastName: parts.slice(1).join(' ') || 'Unknown'
      }
    }
    
    // Try to extract from plain text
    const parts = cleanName.split(' ')
    return {
      firstName: parts[0] || 'Unknown',
      lastName: parts.slice(1).join(' ') || 'Unknown'
    }
  }
  
  /**
   * Extract name from email body or sender
   */
  private static extractName(from: string, body: string): string {
    // Try to find name in email signature
    const signatureMatch = body.match(/--\s*\n([^\n]+)/)
    if (signatureMatch) {
      return signatureMatch[1].trim()
    }
    
    // Try to find name in common patterns
    const nameMatch = body.match(/(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
    if (nameMatch) {
      return nameMatch[1]
    }
    
    // Fallback to sender name
    return from.replace(/<.*>/, '').trim()
  }
  
  /**
   * Extract email addresses from text
   */
  private static extractEmails(text: string, from: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails: string[] = text.match(emailRegex) || []
    
    // Add sender email if not already included
    const senderEmail = from.match(emailRegex)?.[0]
    if (senderEmail && !emails.includes(senderEmail)) {
      emails.unshift(senderEmail)
    }
    
    return [...new Set(emails)] // Remove duplicates
  }
  
  /**
   * Extract phone numbers from text
   */
  private static extractPhoneNumbers(text: string): string[] {
    const phoneRegex = /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g
    const phones: string[] = text.match(phoneRegex) || []
    return [...new Set(phones)] // Remove duplicates
  }
  
  /**
   * Extract company name from text
   */
  private static extractCompany(text: string): string {
    // Look for common company indicators
    const companyMatch = text.match(/(?:at|with|from)\s+([A-Z][A-Za-z\s&]+(?:Inc|LLC|Corp|Company|Ltd|Co\.?))/i)
    if (companyMatch) {
      return companyMatch[1].trim()
    }
    return ''
  }
  
  /**
   * Extract position/title from text
   */
  private static extractPosition(text: string): string {
    // Look for common title patterns
    const titleMatch = text.match(/(?:i am|i'm)\s+(?:a|an)\s+([A-Za-z\s]+)(?:at|with)/i)
    if (titleMatch) {
      return titleMatch[1].trim()
    }
    return ''
  }
  
  /**
   * Extract property address from text
   */
  private static extractPropertyAddress(subject: string, body: string): string {
    const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Terrace|Ter)/i
    const addressMatch = (subject + ' ' + body).match(addressRegex)
    return addressMatch ? addressMatch[0] : ''
  }
  
  /**
   * Extract property details from text
   */
  private static extractPropertyDetails(subject: string, body: string): string {
    const propertyKeywords = ['bedroom', 'bathroom', 'sq ft', 'square feet', 'acres', 'lot', 'garage']
    const text = (subject + ' ' + body).toLowerCase()
    const details: string[] = []
    
    for (const keyword of propertyKeywords) {
      if (text.includes(keyword)) {
        // Extract the sentence containing the keyword
        const sentences = body.split(/[.!?]/)
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            details.push(sentence.trim())
            break
          }
        }
      }
    }
    
    return details.join(' ')
  }

  /**
   * Extract price range from email content
   */
  private static extractPriceRange(subject: string, body: string): string | null {
    const text = `${subject} ${body}`.toLowerCase()
    
    // Common price patterns
    const pricePatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $500k - $750k
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*to\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $500k to $750k
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand|k\s*dollars)/gi, // 500k - 750k
      /budget.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi, // budget $500k
      /price.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi, // price $500k
    ]
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }
    
    return null
  }

  /**
   * Extract property type from email content
   */
  private static extractPropertyType(subject: string, body: string): string | null {
    const text = `${subject} ${body}`.toLowerCase()
    
    const propertyTypes = [
      'single family home', 'single-family home', 'single family', 'house',
      'condo', 'condominium', 'apartment', 'townhouse', 'town home',
      'duplex', 'triplex', 'multi-family', 'commercial', 'land', 'lot',
      'investment property', 'rental property', 'vacation home'
    ]
    
    for (const type of propertyTypes) {
      if (text.includes(type)) {
        return type
      }
    }
    
    return null
  }

  /**
   * Extract location preferences from email content
   */
  private static extractLocationPreferences(subject: string, body: string): string | null {
    const text = `${subject} ${body}`.toLowerCase()
    
    // Look for location keywords
    const locationKeywords = [
      'neighborhood', 'area', 'location', 'near', 'close to', 'in', 'around',
      'downtown', 'suburban', 'rural', 'urban', 'school district', 'zip code'
    ]
    
    const sentences = text.split(/[.!?]/)
    for (const sentence of sentences) {
      for (const keyword of locationKeywords) {
        if (sentence.includes(keyword)) {
          return sentence.trim()
        }
      }
    }
    
    return null
  }

  /**
   * Extract timeline from email content
   */
  private static extractTimeline(subject: string, body: string): string | null {
    const text = `${subject} ${body}`.toLowerCase()
    
    const timelinePatterns = [
      /(?:buy|purchase|move|relocate|sell).*?(?:in|within|by|before|after).*?(?:month|year|week|day)/gi,
      /(?:timeline|timeframe|when).*?(?:month|year|week|day)/gi,
      /(?:urgent|asap|soon|immediate|quick)/gi
    ]
    
    for (const pattern of timelinePatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }
    
    return null
  }
  
  /**
   * Get all active lead sources
   */
  private static async getActiveLeadSources(): Promise<LeadSource[]> {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      return []
    }
  }
  
  /**
   * Get all active detection rules
   */
  private static async getActiveDetectionRules(): Promise<LeadDetectionRule[]> {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('lead_detection_rules')
        .select('*')
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      return []
    }
  }
} 