import { createPerson } from './database'
import type { Person } from './supabase'

export interface EmailLead {
  firstName: string
  lastName: string
  email: string[]
  phone: string[]
  message?: string
  source: 'homestack' | 'email_form' | 'zillow' | 'realtor' | 'other'
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
      const source = this.identifySource(subject, emailData.from as string, body)
      // Extract lead data based on source
      const leadData = await this.extractLeadData(source, subject, body)
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
        source,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Error processing email:', error)
      return null
    }
  }
  
  /**
   * Identify the source of the lead email
   */
  private static identifySource(subject: string, from: string, body: string): EmailLead['source'] {
    const subjectLower = subject.toLowerCase()
    const fromLower = from.toLowerCase()
    const bodyLower = body.toLowerCase()
    
    // HomeStack patterns
    if (subjectLower.includes('homestack') || fromLower.includes('homestack')) {
      return 'homestack'
    }
    
    // Zillow patterns
    if (subjectLower.includes('zillow') || fromLower.includes('zillow') || 
        bodyLower.includes('zillow.com')) {
      return 'zillow'
    }
    
    // Realtor.com patterns
    if (subjectLower.includes('realtor') || fromLower.includes('realtor') || 
        bodyLower.includes('realtor.com')) {
      return 'realtor'
    }
    
    // Generic email form patterns
    if (subjectLower.includes('lead') || subjectLower.includes('inquiry') || 
        subjectLower.includes('contact') || subjectLower.includes('form')) {
      return 'email_form'
    }
    
    return 'other'
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
      // Use Round Robin to assign the lead
      const { getNextRoundRobinUser } = await import('./roundRobin')
      const assignedUserId = await getNextRoundRobinUser()
      
      if (!assignedUserId) {
        console.error('No user available in Round Robin queue')
        return null
      }
      
      const personData: Partial<Person> = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        client_type: 'lead',
        lead_source: lead.source,
        assigned_to: assignedUserId,
        notes: lead.message || `Lead captured from ${lead.source} email on ${lead.timestamp.toLocaleDateString()}`,
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
        description: `Lead captured from ${lead.source} email`,
        created_by: assignedUserId,
      })
      
  
      return newPerson
      
    } catch (error) {
      console.error('Error creating person from email lead:', error)
      return null
    }
  }
} 