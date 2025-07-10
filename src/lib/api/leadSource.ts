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
function transformApiResponse(apiResponse: any): LeadData[] {
  // This function needs to be customized based on the actual API response structure
  // For now, providing a generic example
  
  if (Array.isArray(apiResponse)) {
    return apiResponse.map(item => ({
      first_name: item.first_name || item.firstName || item.name?.split(' ')[0] || '',
      last_name: item.last_name || item.lastName || item.name?.split(' ').slice(1).join(' ') || 'Unknown',
      email: item.email ? [item.email] : [],
      phone: item.phone ? [item.phone] : [],
      company: item.company || item.organization || '',
      position: item.job_title || item.title || '',
      client_type: 'lead',
      lead_source: item.source || 'API',
      // Add other fields as needed based on the actual API
    }))
  }

  // If response is a single object
  if (apiResponse.data && Array.isArray(apiResponse.data)) {
    return transformApiResponse(apiResponse.data)
  }

  // If response is a single lead
  if (apiResponse.first_name || apiResponse.firstName) {
    return [{
      first_name: apiResponse.first_name || apiResponse.firstName || '',
      last_name: apiResponse.last_name || apiResponse.lastName || 'Unknown',
      email: apiResponse.email ? [apiResponse.email] : [],
      phone: apiResponse.phone ? [apiResponse.phone] : [],
      company: apiResponse.company || '',
      position: apiResponse.job_title || '',
      client_type: 'lead',
      lead_source: apiResponse.source || 'API',
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
export async function handleLeadWebhook(payload: any): Promise<boolean> {
  try {
    // Transform webhook payload to LeadData format
    const leadData: LeadData = {
      first_name: payload.first_name || payload.firstName || '',
      last_name: payload.last_name || payload.lastName || 'Unknown',
      email: payload.email ? [payload.email] : [],
      phone: payload.phone ? [payload.phone] : [],
      company: payload.company || '',
      position: payload.job_title || '',
      client_type: 'lead',
      lead_source: payload.source || 'Webhook',
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