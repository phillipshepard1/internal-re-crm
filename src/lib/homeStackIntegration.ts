import { createPerson } from './database'
import { getNextRoundRobinUser } from './roundRobin'
import type { Person } from './supabase'

export interface HomeStackConfig {
  apiKey: string
  baseUrl: string
  webhookSecret?: string
  // SSO configuration
  ssoEnabled?: boolean
  ssoApiKey?: string
  ssoBaseUrl?: string
  ssoBrokerUrl?: string
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
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            // Handle different response formats
            const leads = data.leads || data.users || data.contacts || data.data || data || []
            return this.transformLeads(leads)
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      throw new Error('All HomeStack API endpoints failed')
      
    } catch (error) {
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
          // Continue to next endpoint
        }
      }
      
      return []
      
    } catch (error) {
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
          // Continue to next endpoint
        }
      }
      
      return null
      
    } catch (error) {
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
        return 0
      }
    }
    
    return processedCount
  }
  
  /**
   * Create a person record from HomeStack lead
   */
  public async createPersonFromLead(lead: HomeStackLead): Promise<Person | null> {
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
        lead_source: 'homestack',
        lead_status: 'staging', // New leads go to staging
        assigned_to: adminUser.id, // Assign to admin initially (will be reassigned from staging)
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
        description: `Lead imported from HomeStack and placed in staging`,
        created_by: adminUser.id,
      })
      
      return newPerson
      
    } catch (error) {
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
      console.log('🏗️ createPersonFromUserSignup called with:', userData)
      
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
        console.log('⚠️ User already exists:', existingUser.email)
        return existingUser
      }

      console.log('✅ User does not exist, proceeding with creation')

      // Get admin user for initial assignment
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (!adminUser) {
        return null
      }

      const personData: Partial<Person> = {
        first_name: userData.first_name || userData.email.split('@')[0],
        last_name: userData.last_name || 'Unknown',
        email: [userData.email],
        phone: userData.phone ? [userData.phone] : [],
        client_type: 'lead',
        lead_source: userData.source === 'homestack_mobile' ? 'homestack_mobile' : 'homestack',
        lead_status: 'staging', // New user signups go to staging
        assigned_to: adminUser.id, // Assign to admin initially (will be reassigned from staging)
        notes: `New user from HomeStack ${userData.source === 'homestack_mobile' ? 'mobile app' : 'web'} signup\nHomeStack ID: ${userData.id}\nSignup Date: ${userData.created_at || new Date().toISOString()}\nSource: ${userData.source || 'homestack_user_signup'}${userData.device_info ? `\nDevice: ${userData.device_info}` : ''}`,
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

      const { createPerson } = await import('./database')
      const newPerson = await createPerson(personData)

      console.log('✅ Person created successfully:', newPerson.id)

      // Create activity log
      const { createActivity } = await import('./database')
      await createActivity({
        person_id: newPerson.id,
        type: 'created',
        description: 'New user automatically imported from HomeStack signup',
        created_by: adminUser.id,
      })

      console.log('✅ Activity log created')
      return newPerson

    } catch (error) {
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
      return false
    }
  }

  /**
   * Get existing webhooks from HomeStack
   */
  async getWebhooks(): Promise<Array<{ guid: string; url: string; events: string[]; is_active: boolean }>> {
    try {
      // Try different possible HomeStack webhook endpoints
      const endpoints = [
        '/api/v1/webhooks',
        '/api/webhooks',
        '/api/v1/integrations/webhooks',
        '/api/integrations/webhooks'
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
            const webhooks = data.webhooks || data.data || data || []
            return webhooks.map((webhook: any) => ({
              guid: webhook.guid || webhook.id,
              url: webhook.url,
              events: webhook.events || webhook.event_types || [],
              is_active: webhook.is_active !== false
            }))
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      return []
      
    } catch (error) {
      return []
    }
  }

  /**
   * Register a new webhook with HomeStack
   */
  async registerWebhook(url: string, events: string[] = ['new_user', 'update_user', 'new_chat_message']): Promise<{ success: boolean; webhookGuid?: string; message: string }> {
    try {
      const webhookData = {
        url,
        events,
        is_active: true
      }

      // Try different possible HomeStack webhook registration endpoints
      const endpoints = [
        '/api/v1/webhooks',
        '/api/webhooks',
        '/api/v1/integrations/webhooks',
        '/api/integrations/webhooks'
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(webhookData),
          })
          
          if (response.ok) {
            const data = await response.json()
            const webhookGuid = data.guid || data.id || data.webhook_guid
            return {
              success: true,
              webhookGuid,
              message: 'Webhook registered successfully'
            }
          } else {
            // Continue to next endpoint
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      return {
        success: false,
        message: 'Failed to register webhook - no working endpoints found'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Ensure webhook is registered (create if not exists)
   */
  async ensureWebhookRegistered(url: string): Promise<{ success: boolean; webhookGuid?: string; message: string }> {
    try {
      // First, get existing webhooks
      const webhooks = await this.getWebhooks()
      const existingWebhook = webhooks.find(webhook => webhook.url === url)
      
      if (existingWebhook) {
        return {
          success: true,
          webhookGuid: existingWebhook.guid,
          message: 'Webhook already registered'
        }
      }
      
      // If not found, register new webhook
      return await this.registerWebhook(url)
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Delete a webhook from HomeStack
   */
  async deleteWebhook(webhookGuid: string): Promise<boolean> {
    try {
      // Try different possible HomeStack webhook deletion endpoints
      const endpoints = [
        `/api/v1/webhooks/${webhookGuid}`,
        `/api/webhooks/${webhookGuid}`,
        `/api/v1/integrations/webhooks/${webhookGuid}`,
        `/api/integrations/webhooks/${webhookGuid}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            return true
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      return false
      
    } catch (error) {
      return false
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(webhookGuid: string, url: string, events: string[] = ['new_user', 'update_user', 'new_chat_message']): Promise<boolean> {
    try {
      const webhookData = {
        url,
        events,
        is_active: true
      }

      // Try different possible HomeStack webhook update endpoints
      const endpoints = [
        `/api/v1/webhooks/${webhookGuid}`,
        `/api/webhooks/${webhookGuid}`,
        `/api/v1/integrations/webhooks/${webhookGuid}`,
        `/api/integrations/webhooks/${webhookGuid}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData),
          })
          
          if (response.ok) {
            return true
          }
        } catch (endpointError) {
          // Continue to next endpoint
        }
      }
      
      return false
      
    } catch (error) {
      return false
    }
  }

  /**
   * Generate SSO access token for user login
   */
  async generateSSOToken(userEmail: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      if (!this.config.ssoEnabled || !this.config.ssoApiKey) {
        return {
          success: false,
          error: 'SSO is not enabled or SSO API key is missing'
        }
      }

      const ssoBaseUrl = this.config.ssoBaseUrl || 'https://bkapi.homestack.com'
      
      const form = new FormData()
      form.append('email', userEmail)

      const response = await fetch(`${ssoBaseUrl}/getAccessToken`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.config.ssoApiKey,
        },
        body: form
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Failed to generate SSO token: ${response.status} - ${errorText}`
        }
      }

      const data = await response.json()
      
      if (data.accessToken) {
        return {
          success: true,
          accessToken: data.accessToken
        }
      } else {
        return {
          success: false,
          error: 'No access token received from HomeStack'
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate SSO login URL
   */
  async generateSSOLoginURL(userEmail: string): Promise<{ success: boolean; loginUrl?: string; error?: string }> {
    try {
      const tokenResult = await this.generateSSOToken(userEmail)
      
      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error
        }
      }

      const ssoBrokerUrl = this.config.ssoBrokerUrl || 'https://broker.homestack.com'
      const loginUrl = `${ssoBrokerUrl}/sso?e=${encodeURIComponent(userEmail)}&a=${tokenResult.accessToken}`

      return {
        success: true,
        loginUrl
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Test SSO connection
   */
  async testSSOConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.ssoEnabled || !this.config.ssoApiKey) {
        return {
          success: false,
          message: 'SSO is not enabled or SSO API key is missing'
        }
      }

      const ssoBaseUrl = this.config.ssoBaseUrl || 'https://bkapi.homestack.com'
      
      // Test if the endpoint is accessible by checking the response structure
      const form = new FormData()
      form.append('email', 'test@example.com')

      const response = await fetch(`${ssoBaseUrl}/getAccessToken`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.config.ssoApiKey,
        },
        body: form
      })

      if (response.ok) {
        const responseData = await response.json()
        return {
          success: true,
          message: 'SSO connection successful'
        }
      } else {
        const errorText = await response.text()
        
        // Parse the error response
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.message === 'User not found.') {
            return {
              success: true,
              message: 'SSO connection successful - endpoint is working (test user not found, which is expected)'
            }
          }
        } catch (e) {
          // If we can't parse the error, treat it as a real error
        }
        
        return {
          success: false,
          message: `SSO connection failed: ${response.status} - ${errorText}`
        }
      }

    } catch (error) {
      return {
        success: false,
        message: `SSO connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
} 