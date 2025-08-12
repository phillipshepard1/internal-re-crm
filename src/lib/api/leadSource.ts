import { assignLeadToRoundRobin, LeadData } from '../roundRobin'
import { splitFullName } from '../utils'

export interface LeadSourceConfig {
  apiKey: string
  baseUrl: string
  endpoint: string
  headers?: Record<string, string>
}

// Type guard functions for safe type checking
function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Fetches new leads from the external API
 * @param config The API configuration
 * @returns Array of new leads
 */
export async function fetchNewLeads(config: LeadSourceConfig): Promise<LeadData[]> {
  try {
    const response = await fetch(`${config.baseUrl}${config.endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...config.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transform the API response to our LeadData format
    // This will need to be customized based on the actual API response structure
    return transformApiResponse(data)
  } catch (error) {
    return []
  }
}

/**
 * Transforms API response to our LeadData format
 * @param apiResponse The raw API response
 * @returns Transformed lead data
 */
function transformApiResponse(apiResponse: unknown): LeadData[] {
  // This function needs to be customized based on the actual API response structure
  // For now, providing a generic example with safe type checking
  
  if (Array.isArray(apiResponse)) {
    return apiResponse.map(item => {
      if (isValidObject(item)) {
        const obj = item as Record<string, unknown>
        
        // Safe name extraction using utility function
        let firstName = ''
        let lastName = 'Unknown'
        
        if (isString(obj.first_name)) {
          firstName = obj.first_name
        } else if (isString(obj.firstName)) {
          firstName = obj.firstName
        } else if (isString(obj.name)) {
          const { firstName: fName, lastName: lName } = splitFullName(obj.name)
          firstName = fName
          lastName = lName || 'Unknown'
        }
        
        // Override lastName if explicitly provided
        if (isString(obj.last_name)) {
          lastName = obj.last_name
        } else if (isString(obj.lastName)) {
          lastName = obj.lastName
        }
        
        return {
          first_name: firstName,
          last_name: lastName,
          email: isString(obj.email) ? [obj.email] : [],
          phone: isString(obj.phone) ? [obj.phone] : [],
          company: isString(obj.company) ? obj.company : (isString(obj.organization) ? obj.organization : ''),
          position: isString(obj.job_title) ? obj.job_title : (isString(obj.title) ? obj.title : ''),
          client_type: 'lead',
          lead_source: isString(obj.source) ? obj.source : 'API',
        }
      }
      return {
        first_name: '',
        last_name: 'Unknown',
        email: [],
        phone: [],
        company: '',
        position: '',
        client_type: 'lead',
        lead_source: 'API',
      }
    })
  }

  // If response is a single object with a data array
  if (
    typeof apiResponse === 'object' &&
    apiResponse !== null &&
    'data' in apiResponse &&
    Array.isArray((apiResponse as Record<string, unknown>).data)
  ) {
    return transformApiResponse((apiResponse as Record<string, unknown>).data)
  }

  // If response is a single lead
  if (
    typeof apiResponse === 'object' &&
    apiResponse !== null &&
    ('first_name' in apiResponse || 'firstName' in apiResponse)
  ) {
    const obj = apiResponse as Record<string, unknown>
    return [{
      first_name: (obj.first_name as string) || (obj.firstName as string) || '',
      last_name: (obj.last_name as string) || (obj.lastName as string) || 'Unknown',
      email: obj.email ? [obj.email as string] : [],
      phone: obj.phone ? [obj.phone as string] : [],
      company: (obj.company as string) || '',
      position: (obj.job_title as string) || '',
      client_type: 'lead',
      lead_source: (obj.source as string) || 'API',
    }]
  }

  return []
}

/**
 * Processes new leads and assigns them via round robin
 * @param config The API configuration
 * @returns Number of leads processed
 */
export async function processNewLeads(config: LeadSourceConfig): Promise<number> {
  try {

    const leads = await fetchNewLeads(config)
    
    if (leads.length === 0) {
  
      return 0
    }


    
    let processedCount = 0
    
    for (const lead of leads) {
      try {
        await assignLeadToRoundRobin(lead)
        processedCount++

      } catch (error) {
        // Continue processing other leads even if one fails
      }
    }


    return processedCount
  } catch (error) {
    return 0
  }
}

/**
 * Webhook handler for real-time lead notifications
 * @param payload The webhook payload
 * @returns Success status
 */
export async function handleLeadWebhook(payload: unknown): Promise<boolean> {
  try {
    if (typeof payload !== 'object' || payload === null) return false
    const obj = payload as Record<string, unknown>
    // Transform webhook payload to LeadData format
    const leadData: LeadData = {
      first_name: (obj.first_name as string) || (obj.firstName as string) || '',
      last_name: (obj.last_name as string) || (obj.lastName as string) || 'Unknown',
      email: obj.email ? [obj.email as string] : [],
      phone: obj.phone ? [obj.phone as string] : [],
      company: (obj.company as string) || '',
      position: (obj.job_title as string) || '',
      client_type: 'lead',
      lead_source: (obj.source as string) || 'Webhook',
    }

    // Assign the lead via round robin
    await assignLeadToRoundRobin(leadData)
    

    return true
  } catch (error) {
    return false
  }
} 