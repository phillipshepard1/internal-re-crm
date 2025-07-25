import { createPerson } from './database'
import type { Person } from './supabase'

export interface EmailLead {
  firstName: string
  lastName: string
  email: string[]
  phone: string[]
  message?: string
  source: 'homestack' | 'email_form' | 'zillow' | 'realtor' | 'other'
  leadSourceId?: string
  leadSourceName?: string
  listingAddress?: string
  propertyDetails?: string
  timestamp: Date
}

export class EmailLeadProcessor {
  /**
   * Process incoming email and extract lead information
   */
  static async processEmail(emailData: Record<string, unknown>): Promise<EmailLead | null> {
    try {
      const subject = emailData.subject as string
      const body = emailData.body as string
      // Try to identify the source based on email patterns
      const sourceInfo = await this.identifySource(subject, emailData.from as string, body)
      // Extract lead data based on source
      const leadData = await this.extractLeadData(sourceInfo.source, subject, body)
      if (!leadData) {
        return null
      }
      return {
        firstName: leadData.firstName || '',
        lastName: leadData.lastName || '',
        email: leadData.email || [],
        phone: leadData.phone || [],
        message: leadData.message,
        listingAddress: leadData.listingAddress,
        propertyDetails: leadData.propertyDetails,
        source: sourceInfo.source,
        leadSourceId: sourceInfo.leadSourceId,
        leadSourceName: sourceInfo.leadSourceName,
        timestamp: new Date()
      }
    } catch (error) {
      return null
    }
  }
  
  /**
   * Identify the source of the lead email
   */
  private static async identifySource(subject: string, from: string, body: string): Promise<{ source: EmailLead['source']; leadSourceId?: string; leadSourceName?: string }> {
    const subjectLower = subject.toLowerCase()
    const fromLower = from.toLowerCase()
    const bodyLower = body.toLowerCase()
    
    // Try to detect lead source from database first
    try {
      const { detectLeadSourceFromEmail } = await import('./database')
      const detectedSource = await detectLeadSourceFromEmail(from)
      
      if (detectedSource) {
        return { 
          source: 'email_form', 
          leadSourceId: detectedSource.id, 
          leadSourceName: detectedSource.name 
        }
      }
    } catch (error) {
      console.error('Error detecting lead source from database:', error)
    }
    
    // Fallback to hardcoded detection
    // HomeStack patterns
    if (subjectLower.includes('homestack') || fromLower.includes('homestack')) {
      return { source: 'homestack' }
    }
    
    // Zillow patterns
    if (subjectLower.includes('zillow') || fromLower.includes('zillow') || 
        bodyLower.includes('zillow.com')) {
      return { source: 'zillow' }
    }
    
    // Realtor.com patterns
    if (subjectLower.includes('realtor') || fromLower.includes('realtor') || 
        bodyLower.includes('realtor.com')) {
      return { source: 'realtor' }
    }
    
    // Generic email form patterns
    if (subjectLower.includes('lead') || subjectLower.includes('inquiry') || 
        subjectLower.includes('contact') || subjectLower.includes('form') ||
        subjectLower.includes('property') || subjectLower.includes('house') ||
        subjectLower.includes('home') || subjectLower.includes('real estate')) {
      return { source: 'email_form' }
    }
    
    return { source: 'other' }
  }
  
  /**
   * Extract lead data based on the identified source
   */
  private static async extractLeadData(
    source: EmailLead['source'], 
    subject: string, 
    body: string
  ): Promise<Partial<EmailLead> | null> {
    
    switch (source) {
      case 'homestack':
        return this.parseHomeStackEmail(subject, body)
        
      case 'zillow':
        return this.parseZillowEmail(subject, body)
        
      case 'realtor':
        return this.parseRealtorEmail(subject, body)
        
      case 'email_form':
        return this.parseGenericEmailForm(subject, body)
        
      default:
        return this.parseGenericEmail(subject, body)
    }
  }
  
  /**
   * Parse HomeStack specific email format
   */
  private static parseHomeStackEmail(subject: string, body: string): Partial<EmailLead> | null {
    // Extract name from subject (e.g., "New Lead: John Doe")
    const nameMatch = subject.match(/New Lead:\s*(.+)/i)
    if (!nameMatch) return null
    
    const fullName = nameMatch[1].trim()
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ')
    
    // Extract email and phone from body
    const emailMatch = body.match(/Email:\s*([^\s\n]+)/i)
    const phoneMatch = body.match(/Phone:\s*([^\s\n]+)/i)
    const messageMatch = body.match(/Message:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
    
    return {
      firstName: firstName || '',
      lastName: lastName || '',
      email: emailMatch ? [emailMatch[1]] : [],
      phone: phoneMatch ? [phoneMatch[1]] : [],
      message: messageMatch ? messageMatch[1].trim() : undefined
    }
  }
  
  /**
   * Parse Zillow email format
   */
  private static parseZillowEmail(subject: string, body: string): Partial<EmailLead> | null {
    // Zillow typically includes property address in subject
    const addressMatch = subject.match(/inquiry about (.+)/i)
    
    // Extract contact info from body
    const nameMatch = body.match(/Name:\s*(.+)/i)
    const emailMatch = body.match(/Email:\s*([^\s\n]+)/i)
    const phoneMatch = body.match(/Phone:\s*([^\s\n]+)/i)
    const messageMatch = body.match(/Message:\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
    
    if (!nameMatch) return null
    
    const fullName = nameMatch[1].trim()
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ')
    
    return {
      firstName: firstName || '',
      lastName: lastName || '',
      email: emailMatch ? [emailMatch[1]] : [],
      phone: phoneMatch ? [phoneMatch[1]] : [],
      message: messageMatch ? messageMatch[1].trim() : undefined,
      listingAddress: addressMatch ? addressMatch[1] : undefined
    }
  }
  
  /**
   * Parse Realtor.com email format
   */
  private static parseRealtorEmail(subject: string, body: string): Partial<EmailLead> | null {
    // Similar to Zillow but with Realtor.com specific patterns
    return this.parseZillowEmail(subject, body) // Use same parser for now
  }
  
  /**
   * Parse generic email form
   */
  private static parseGenericEmailForm(subject: string, body: string): Partial<EmailLead> | null {
    // Look for common form field patterns
    const nameMatch = body.match(/(?:Name|Full Name):\s*(.+)/i)
    const emailMatch = body.match(/(?:Email|E-mail):\s*([^\s\n]+)/i)
    const phoneMatch = body.match(/(?:Phone|Telephone):\s*([^\s\n]+)/i)
    const messageMatch = body.match(/(?:Message|Comments|Notes):\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
    
    if (!nameMatch) return null
    
    const fullName = nameMatch[1].trim()
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ')
    
    return {
      firstName: firstName || '',
      lastName: lastName || '',
      email: emailMatch ? [emailMatch[1]] : [],
      phone: phoneMatch ? [phoneMatch[1]] : [],
      message: messageMatch ? messageMatch[1].trim() : undefined
    }
  }
  
  /**
   * Parse generic email (fallback)
   */
  private static parseGenericEmail(subject: string, body: string): Partial<EmailLead> | null {
    // Try to extract any recognizable contact information
    const emailMatch = body.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
    const phoneMatch = body.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g)
    
    // Try to extract name from subject or body
    const nameMatch = subject.match(/(.+?)(?:\s*[-|]\s*|$)/) || body.match(/Name:\s*(.+)/i)
    
    if (!nameMatch) return null
    
    const fullName = nameMatch[1].trim()
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ')
    
    return {
      firstName: firstName || '',
      lastName: lastName || '',
      email: emailMatch || [],
      phone: phoneMatch || [],
      message: body.length > 200 ? body.substring(0, 200) + '...' : body
    }
  }
  
  /**
   * Create a new person record from email lead
   */
  static async createPersonFromEmail(lead: EmailLead): Promise<Person | null> {
    try {
      // Get admin user for initial assignment (leads go to staging first)
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (!adminUser) {
        return null
      }
      
      const personData: Partial<Person> = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        client_type: 'lead',
        lead_source: lead.leadSourceName || lead.source,
        lead_source_id: lead.leadSourceId || undefined,
        lead_status: 'staging', // New leads go to staging
        assigned_to: adminUser.id, // Assign to admin initially (will be reassigned from staging)
        notes: lead.message || `Lead captured from ${lead.leadSourceName || lead.source} email on ${lead.timestamp.toLocaleDateString()}`,
        // Set default values
        profile_picture: null,
        birthday: null,
        mailing_address: null,
        relationship_id: null,
        last_interaction: new Date().toISOString(),
        next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        best_to_reach_by: null,
        lists: [],
        company: undefined,
        position: undefined,
        address: lead.listingAddress,
        city: undefined,
        state: undefined,
        zip_code: undefined,
        country: undefined,
        looking_for: lead.propertyDetails,
        selling: undefined,
        closed: undefined,
      }
      
      const newPerson = await createPerson(personData)
      
      // Create an activity log entry
      const { createActivity } = await import('./database')
      await createActivity({
        person_id: newPerson.id,
        type: 'created',
        description: `Lead captured from ${lead.source} email and placed in staging`,
        created_by: adminUser.id,
      })
      
  
      return newPerson
      
    } catch (error) {
      return null
    }
  }

  /**
   * Create a new person record from AI-detected lead data
   * Note: This method is deprecated. Use the API route /api/leads/process-email instead.
   */
  static async createPersonFromLeadData(leadData: {
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
  }): Promise<Person | null> {
    // This method is deprecated - the functionality has been moved to the API route
    // to avoid client-side Supabase service key usage
    console.warn('createPersonFromLeadData is deprecated. Use /api/leads/process-email API route instead.')
    return null
  }
} 