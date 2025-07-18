import { createPerson } from './database'
import { getNextRoundRobinUser } from './roundRobin'
import type { Person } from './supabase'

export interface HomeStackConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
}

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
  // Additional HomeStack specific fields
  leadSource?: string
  propertyType?: string
  budget?: string
  timeline?: string
  notes?: string
  tags?: string[]
}

export class HomeStackIntegration {
  private config: HomeStackConfig
  
  constructor(config: HomeStackConfig) {
    this.config = config
  }
  
  /**
   * Fetch recent leads from HomeStack API using their private API
   */
  async fetchRecentLeads(limit: number = 50): Promise<HomeStackLead[]> {
    try {
      // Use the proper HomeStack API endpoint
      const response = await fetch(`${this.config.baseUrl}/api/v1/leads?limit=${limit}&status=all`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('HomeStack API error:', response.status, errorText)
        throw new Error(`HomeStack API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      // Handle different response formats
      const leads = data.leads || data.data || data || []
      return this.transformLeads(leads)
      
    } catch (error) {
      console.error('Error fetching HomeStack leads:', error)
      return []
    }
  }

  /**
   * Fetch leads by status
   */
  async fetchLeadsByStatus(status: string, limit: number = 50): Promise<HomeStackLead[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/leads?status=${status}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HomeStack API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const leads = data.leads || data.data || data || []
      return this.transformLeads(leads)
      
    } catch (error) {
      console.error(`Error fetching HomeStack leads with status ${status}:`, error)
      return []
    }
  }

  /**
   * Fetch a specific lead by ID
   */
  async fetchLeadById(leadId: string): Promise<HomeStackLead | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/leads/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HomeStack API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      const leads = this.transformLeads([data.lead || data])
      return leads[0] || null
      
    } catch (error) {
      console.error(`Error fetching HomeStack lead ${leadId}:`, error)
      return null
    }
  }
  
  /**
   * Transform HomeStack API response to our lead format
   */
  public transformLeads(apiLeads: Record<string, unknown>[]): HomeStackLead[] {
    return apiLeads.map(lead => {
      const status = (lead.status as string) || 'new'
      const validStatus = ['new', 'contacted', 'qualified', 'converted'].includes(status) 
        ? status as 'new' | 'contacted' | 'qualified' | 'converted'
        : 'new'
      
      // Handle different email formats from HomeStack API
      let emails: string[] = []
      if (Array.isArray(lead.email)) {
        emails = lead.email as string[]
      } else if (lead.email) {
        emails = [lead.email as string]
      } else if (lead.email_address) {
        emails = [lead.email_address as string]
      }
      
      // Handle different phone formats
      let phones: string[] = []
      if (Array.isArray(lead.phone)) {
        phones = lead.phone as string[]
      } else if (lead.phone) {
        phones = [lead.phone as string]
      } else if (lead.phone_number) {
        phones = [lead.phone_number as string]
      }
      
      return {
        id: lead.id as string,
        firstName: (lead.first_name as string) || (lead.firstName as string) || (typeof lead.name === 'string' ? lead.name.split(' ')[0] : ''),
        lastName: (lead.last_name as string) || (lead.lastName as string) || (typeof lead.name === 'string' ? lead.name.split(' ').slice(1).join(' ') : ''),
        email: emails,
        phone: phones,
        message: (lead.message as string) || (lead.notes as string) || (lead.comments as string) || (lead.description as string),
        propertyAddress: (lead.property_address as string) || (lead.address as string) || (lead.property_address_1 as string),
        propertyDetails: (lead.property_details as string) || (lead.listing_details as string) || (lead.property_type as string),
        source: 'homestack' as const,
        createdAt: new Date(lead.created_at as string || lead.createdAt as string || lead.date_created as string || Date.now()),
        status: validStatus,
        // Additional HomeStack specific fields
        leadSource: lead.lead_source as string,
        propertyType: lead.property_type as string,
        budget: lead.budget as string,
        timeline: lead.timeline as string,
        notes: lead.notes as string,
        tags: Array.isArray(lead.tags) ? lead.tags as string[] : []
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
  public async createPersonFromLead(lead: HomeStackLead): Promise<Person | null> {
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
   * Create a person record from HomeStack user signup (assigned to admin first)
   */
  async createPersonFromUserSignup(userData: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    created_at?: string
    [key: string]: any
  }): Promise<Person | null> {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('people')
        .select('*')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        console.log('User already exists:', userData.email)
        return existingUser
      }

      // Get admin user for initial assignment
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (!adminUser) {
        console.error('No admin user found for assignment')
        return null
      }

      const personData: Partial<Person> = {
        first_name: userData.first_name || userData.email.split('@')[0],
        last_name: userData.last_name || 'Unknown',
        email: [userData.email],
        phone: userData.phone ? [userData.phone] : [],
        client_type: 'lead',
        lead_source: 'homestack',
        assigned_to: adminUser.id, // Assign to admin initially
        notes: `New user from HomeStack signup\nHomeStack ID: ${userData.id}\nSignup Date: ${userData.created_at || new Date().toISOString()}\nSource: homestack_user_signup`,
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
        address: undefined,
        city: undefined,
        state: undefined,
        zip_code: undefined,
        country: undefined,
        looking_for: undefined,
        selling: undefined,
        closed: undefined
      }

      const newPerson = await createPerson(personData)

      // Create activity log
      const { createActivity } = await import('./database')
      await createActivity({
        person_id: newPerson.id,
        type: 'created',
        description: 'New user automatically imported from HomeStack signup',
        created_by: adminUser.id,
      })

      console.log('Successfully created person from HomeStack user signup:', newPerson.id)
      return newPerson

    } catch (error) {
      console.error('Error creating person from HomeStack user signup:', error)
      return null
    }
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