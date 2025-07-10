import { createPerson } from './database'
import { getNextRoundRobinUser } from './roundRobin'
import type { Person } from './supabase'

export interface HomeStackLead {
  id: string
  firstName: string
  lastName: string
  email: string[]
  phone: string[]
  message?: string
  propertyAddress?: string
  propertyDetails?: string
  source: 'homestack'
  createdAt: Date
  status: 'new' | 'contacted' | 'qualified' | 'converted'
}

export interface HomeStackConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
}

export class HomeStackIntegration {
  private config: HomeStackConfig
  
  constructor(config: HomeStackConfig) {
    this.config = config
  }
  
  /**
   * Fetch recent leads from HomeStack API
   */
  async fetchRecentLeads(limit: number = 50): Promise<HomeStackLead[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/leads?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HomeStack API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      return this.transformLeads(data.leads || [])
      
    } catch (error) {
      console.error('Error fetching HomeStack leads:', error)
      return []
    }
  }
  
  /**
   * Transform HomeStack API response to our lead format
   */
  private transformLeads(apiLeads: Record<string, unknown>[]): HomeStackLead[] {
    return apiLeads.map(lead => {
      const status = (lead.status as string) || 'new'
      const validStatus = ['new', 'contacted', 'qualified', 'converted'].includes(status) 
        ? status as 'new' | 'contacted' | 'qualified' | 'converted'
        : 'new'
      
      return {
        id: lead.id as string,
        firstName: (lead.first_name as string) || (lead.firstName as string) || '',
        lastName: (lead.last_name as string) || (lead.lastName as string) || '',
        email: Array.isArray(lead.email) ? lead.email as string[] : [lead.email as string || ''],
        phone: Array.isArray(lead.phone) ? lead.phone as string[] : [lead.phone as string || ''],
        message: (lead.message as string) || (lead.notes as string) || (lead.comments as string),
        propertyAddress: (lead.property_address as string) || (lead.address as string),
        propertyDetails: (lead.property_details as string) || (lead.listing_details as string),
        source: 'homestack' as const,
        createdAt: new Date(lead.created_at as string || lead.createdAt as string || Date.now()),
        status: validStatus
      }
    })
    
  }
  
  /**
   * Process HomeStack leads and create contacts
   */
  async processLeads(leads: HomeStackLead[]): Promise<number> {
    let processedCount = 0
    
    for (const lead of leads) {
      try {
        const person = await this.createPersonFromLead(lead)
        if (person) {
          processedCount++
          console.log(`Processed HomeStack lead: ${person.first_name} ${person.last_name}`)
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error)
      }
    }
    
    return processedCount
  }
  
  /**
   * Create a person record from HomeStack lead
   */
  private async createPersonFromLead(lead: HomeStackLead): Promise<Person | null> {
    try {
      // Get next user in Round Robin
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
        lead_source: 'homestack',
        assigned_to: assignedUserId,
        notes: lead.message || `Lead from HomeStack - ${lead.createdAt.toLocaleDateString()}`,
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
        address: lead.propertyAddress,
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
        description: `Lead imported from HomeStack`,
        created_by: assignedUserId,
      })
      
      return newPerson
      
    } catch (error) {
      console.error('Error creating person from HomeStack lead:', error)
      return null
    }
  }
  
  /**
   * Handle webhook from HomeStack (for real-time lead capture)
   */
  async handleWebhook(payload: Record<string, unknown>, signature?: string): Promise<boolean> {
    try {
      // Verify webhook signature if secret is provided
      if (this.config.webhookSecret && signature) {
        const isValid = this.verifyWebhookSignature()
        if (!isValid) {
          console.error('Invalid webhook signature')
          return false
        }
      }
      
      // Process the webhook payload
      if (payload.type === 'lead.created' || payload.type === 'lead.updated') {
        const lead = this.transformLeads([payload.data as Record<string, unknown>])[0]
        const person = await this.createPersonFromLead(lead)
        return !!person
      }
      
      return true
      
    } catch (error) {
      console.error('Error handling HomeStack webhook:', error)
      return false
    }
  }
  
  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(): boolean {
    // Implement signature verification based on HomeStack's webhook security
    // This is a placeholder - implement based on HomeStack's documentation
    return true
  }
  
  /**
   * Update lead status in HomeStack
   */
  async updateLeadStatus(leadId: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      return response.ok
      
    } catch (error) {
      console.error('Error updating HomeStack lead status:', error)
      return false
    }
  }
} 