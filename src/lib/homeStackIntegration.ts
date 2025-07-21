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
      // Try different possible HomeStack API endpoints
      const endpoints = [
        `/api/v1/leads?limit=${limit}&status=all`,
        `/api/leads?limit=${limit}`,
        `/api/v1/users?limit=${limit}`,
        `/api/users?limit=${limit}`,
        `/api/v1/contacts?limit=${limit}`,
        `/api/contacts?limit=${limit}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying HomeStack endpoint: ${this.config.baseUrl}${endpoint}`)
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Success with endpoint: ${endpoint}`, { dataKeys: Object.keys(data) })
            
            // Handle different response formats
            const leads = data.leads || data.users || data.contacts || data.data || data || []
            return this.transformLeads(leads)
          } else {
            console.log(`❌ Endpoint ${endpoint} failed: ${response.status}`)
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} error:`, endpointError)
        }
      }
      
      // If all endpoints fail, return empty array
      console.error('All HomeStack API endpoints failed')
      return []
      
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
      // Try different possible HomeStack API endpoints with status filter
      const endpoints = [
        `/api/v1/leads?status=${status}&limit=${limit}`,
        `/api/leads?status=${status}&limit=${limit}`,
        `/api/v1/users?status=${status}&limit=${limit}`,
        `/api/users?status=${status}&limit=${limit}`,
        `/api/v1/contacts?status=${status}&limit=${limit}`,
        `/api/contacts?status=${status}&limit=${limit}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const leads = data.leads || data.users || data.contacts || data.data || data || []
            return this.transformLeads(leads)
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} error:`, endpointError)
        }
      }
      
      return []
      
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
      // Try different possible HomeStack API endpoints for individual items
      const endpoints = [
        `/api/v1/leads/${leadId}`,
        `/api/leads/${leadId}`,
        `/api/v1/users/${leadId}`,
        `/api/users/${leadId}`,
        `/api/v1/contacts/${leadId}`,
        `/api/contacts/${leadId}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const leads = this.transformLeads([data.lead || data.user || data.contact || data])
            return leads[0] || null
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} error:`, endpointError)
        }
      }
      
      return null
      
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
    source?: string
    platform?: string
    [key: string]: any
  }): Promise<Person | null> {
    try {
      console.log('🔄 Starting createPersonFromUserSignup with data:', userData)
      
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
      const { data: existingUser, error: existingError } = await supabase
        .from('people')
        .select('*')
        .eq('email', userData.email)
        .single()

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('❌ Error checking existing user:', existingError)
      }

      if (existingUser) {
        console.log('ℹ️ User already exists:', userData.email, 'ID:', existingUser.id)
        return existingUser
      }

      // Get admin user for initial assignment
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (adminError || !adminUser) {
        console.error('❌ No admin user found for assignment:', adminError)
        return null
      }

      // Enhanced person data with mobile app support
      const personData: Partial<Person> = {
        first_name: userData.first_name || userData.email.split('@')[0],
        last_name: userData.last_name || 'Unknown',
        email: [userData.email],
        phone: userData.phone ? [userData.phone] : [],
        client_type: 'lead',
        lead_source: userData.source || 'homestack',
        assigned_to: adminUser.id, // Assign to admin initially
        notes: `New user from HomeStack signup
HomeStack ID: ${userData.id}
Signup Date: ${userData.created_at || new Date().toISOString()}
Source: ${userData.source || 'homestack_user_signup'}
Platform: ${userData.platform || 'unknown'}
Mobile App: ${userData.platform === 'mobile_app' ? 'Yes' : 'No'}`,
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

      console.log('🔄 Creating person with data:', personData)

      const newPerson = await createPerson(personData)

      if (!newPerson) {
        console.error('❌ Failed to create person in database')
        return null
      }

      // Create activity log
      const { createActivity } = await import('./database')
      await createActivity({
        person_id: newPerson.id,
        type: 'created',
        description: `New user automatically imported from HomeStack signup (${userData.platform || 'web'})`,
        created_by: adminUser.id,
      })

      console.log('✅ Successfully created person from HomeStack user signup:', {
        person_id: newPerson.id,
        email: userData.email,
        source: userData.source,
        platform: userData.platform,
        assigned_to: adminUser.id
      })
      
      return newPerson

    } catch (error) {
      console.error('❌ Error creating person from HomeStack user signup:', error)
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

  /**
   * Get existing webhooks from HomeStack
   */
  async getWebhooks(): Promise<any[]> {
    try {
      console.log('🔍 Fetching existing webhooks from HomeStack...')
      
      const response = await fetch(`${this.config.baseUrl}/app/webhooks`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Webhooks fetched successfully:', data)
        return data.webhooks || []
      } else {
        console.error('❌ Failed to fetch webhooks:', response.status, response.statusText)
        return []
      }
    } catch (error) {
      console.error('❌ Error fetching webhooks:', error)
      return []
    }
  }

  /**
   * Register a new webhook with HomeStack
   */
  async registerWebhook(webhookUrl: string): Promise<boolean> {
    try {
      console.log('🔗 Registering webhook with HomeStack:', webhookUrl)
      
      const response = await fetch(`${this.config.baseUrl}/app/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Webhook registered successfully:', data)
        return true
      } else {
        const errorData = await response.text()
        console.error('❌ Failed to register webhook:', response.status, errorData)
        return false
      }
    } catch (error) {
      console.error('❌ Error registering webhook:', error)
      return false
    }
  }

  /**
   * Delete a webhook from HomeStack
   */
  async deleteWebhook(webhookGuid: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting webhook from HomeStack:', webhookGuid)
      
      const response = await fetch(`${this.config.baseUrl}/app/webhooks/${webhookGuid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log('✅ Webhook deleted successfully')
        return true
      } else {
        console.error('❌ Failed to delete webhook:', response.status, response.statusText)
        return false
      }
    } catch (error) {
      console.error('❌ Error deleting webhook:', error)
      return false
    }
  }

  /**
   * Update an existing webhook URL
   */
  async updateWebhook(webhookGuid: string, newUrl: string): Promise<boolean> {
    try {
      console.log('🔄 Updating webhook URL:', webhookGuid, '->', newUrl)
      
      const response = await fetch(`${this.config.baseUrl}/app/webhooks/${webhookGuid}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: newUrl
        })
      })
      
      if (response.ok) {
        console.log('✅ Webhook updated successfully')
        return true
      } else {
        console.error('❌ Failed to update webhook:', response.status, response.statusText)
        return false
      }
    } catch (error) {
      console.error('❌ Error updating webhook:', error)
      return false
    }
  }

  /**
   * Ensure webhook is registered (check existing and register if needed)
   */
  async ensureWebhookRegistered(webhookUrl: string): Promise<{ success: boolean; message: string; webhookGuid?: string }> {
    try {
      console.log('🔍 Ensuring webhook is registered:', webhookUrl)
      
      // Get existing webhooks
      const existingWebhooks = await this.getWebhooks()
      
      // Check if our webhook URL is already registered
      const existingWebhook = existingWebhooks.find(webhook => webhook.url === webhookUrl)
      
      if (existingWebhook) {
        console.log('✅ Webhook already registered:', existingWebhook.guid)
        return {
          success: true,
          message: 'Webhook already registered',
          webhookGuid: existingWebhook.guid
        }
      }
      
      // Register new webhook
      const registered = await this.registerWebhook(webhookUrl)
      
      if (registered) {
        // Get the newly registered webhook to get its GUID
        const updatedWebhooks = await this.getWebhooks()
        const newWebhook = updatedWebhooks.find(webhook => webhook.url === webhookUrl)
        
        return {
          success: true,
          message: 'Webhook registered successfully',
          webhookGuid: newWebhook?.guid
        }
      } else {
        return {
          success: false,
          message: 'Failed to register webhook'
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring webhook registration:', error)
      return {
        success: false,
        message: 'Error ensuring webhook registration'
      }
    }
  }
} 