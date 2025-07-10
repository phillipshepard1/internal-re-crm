import { assignLeadToRoundRobin, LeadData } from '../roundRobin'

export interface LeadSourceConfig {
  apiKey: string
  baseUrl: string
  endpoint: string
  headers?: Record<string, string>
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
    console.error('Error fetching leads from API:', error)
    throw error
  }
}

/**
 * Transforms API response to our LeadData format
 * @param apiResponse The raw API response
 * @returns Transformed lead data
 */
function transformApiResponse(apiResponse: unknown): LeadData[] {
  // This function needs to be customized based on the actual API response structure
  // For now, providing a generic example
  
  if (Array.isArray(apiResponse)) {
    return (apiResponse as unknown[]).map(item => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return {
          first_name: (obj.first_name as string) || (obj.firstName as string) || (typeof obj.name === 'string' ? obj.name.split(' ')[0] : '') || '',
          last_name: (obj.last_name as string) || (obj.lastName as string) || (typeof obj.name === 'string' ? obj.name.split(' ').slice(1).join(' ') : '') || 'Unknown',
          email: obj.email ? [obj.email as string] : [],
          phone: obj.phone ? [obj.phone as string] : [],
          company: (obj.company as string) || (obj.organization as string) || '',
          position: (obj.job_title as string) || (obj.title as string) || '',
          client_type: 'lead',
          lead_source: (obj.source as string) || 'API',
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
    console.log('Fetching new leads from API...')
    const leads = await fetchNewLeads(config)
    
    if (leads.length === 0) {
      console.log('No new leads found')
      return 0
    }

    console.log(`Found ${leads.length} new leads, processing...`)
    
    let processedCount = 0
    
    for (const lead of leads) {
      try {
        await assignLeadToRoundRobin(lead)
        processedCount++
        console.log(`Processed lead: ${lead.first_name} ${lead.last_name}`)
      } catch (error) {
        console.error(`Failed to process lead ${lead.first_name} ${lead.last_name}:`, error)
        // Continue processing other leads even if one fails
      }
    }

    console.log(`Successfully processed ${processedCount} out of ${leads.length} leads`)
    return processedCount
  } catch (error) {
    console.error('Error processing new leads:', error)
    throw error
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
    
    console.log(`Webhook lead processed: ${leadData.first_name} ${leadData.last_name}`)
    return true
  } catch (error) {
    console.error('Error processing webhook lead:', error)
    return false
  }
} 