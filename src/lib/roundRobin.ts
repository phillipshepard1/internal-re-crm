import { getNextRoundRobinUser, assignLeadToUser } from './database'
import type { Person } from './supabase'

export interface LeadData {
  first_name: string
  last_name: string
  email?: string[]
  phone?: string[]
  company?: string
  position?: string
  client_type?: string
  lead_source?: string
  // Add other lead fields as needed
}

/**
 * Assigns a lead to the next available user in the Round Robin queue
 * This is a convenience function that uses the RoundRobinService
 */
export async function assignLeadToRoundRobin(leadData: LeadData): Promise<Person | null> {
  return RoundRobinService.assignLead(leadData)
}

export class RoundRobinService {
  /**
   * Assigns a new lead to the next available user in the Round Robin queue
   */
  static async assignLead(leadData: LeadData): Promise<Person | null> {
    try {
      // Get the next user in the Round Robin queue
      const nextUserId = await getNextRoundRobinUser()
      
      if (!nextUserId) {
        console.warn('No active users found in Round Robin queue')
        return null
      }
      
      // Create the person record and assign to the user
      const personData: Partial<Person> = {
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email || [],
        phone: leadData.phone || [],
        company: leadData.company,
        position: leadData.position,
        client_type: leadData.client_type || 'lead',
        lead_source: leadData.lead_source,
        assigned_to: nextUserId,
        // Set default values
        profile_picture: null,
        birthday: null,
        mailing_address: null,
        relationship_id: null,
        last_interaction: null,
        next_follow_up: null,
        best_to_reach_by: null,
        notes: null,
        lists: [],
        address: undefined,
        city: undefined,
        state: undefined,
        zip_code: undefined,
        country: undefined,
      }
      
      const assignedPerson = await assignLeadToUser(personData, nextUserId)
      
      console.log(`Lead assigned to user ${nextUserId}:`, assignedPerson)
      return assignedPerson
      
    } catch (error) {
      console.error('Error assigning lead via Round Robin:', error)
      throw error
    }
  }
  
  /**
   * Processes multiple leads in batch
   */
  static async assignLeadsBatch(leadsData: LeadData[]): Promise<Person[]> {
    const assignedLeads: Person[] = []
    
    for (const leadData of leadsData) {
      try {
        const assignedLead = await this.assignLead(leadData)
        if (assignedLead) {
          assignedLeads.push(assignedLead)
        }
      } catch (error) {
        console.error(`Error assigning lead ${leadData.first_name} ${leadData.last_name}:`, error)
        // Continue with next lead even if one fails
      }
    }
    
    return assignedLeads
  }
  
  /**
   * Validates lead data before assignment
   */
  static validateLeadData(leadData: LeadData): boolean {
    if (!leadData.first_name?.trim()) {
      throw new Error('First name is required for lead assignment')
    }
    
    if (!leadData.last_name?.trim()) {
      throw new Error('Last name is required for lead assignment')
    }
    
    // At least one contact method should be provided
    if ((!leadData.email || leadData.email.length === 0) && 
        (!leadData.phone || leadData.phone.length === 0)) {
      throw new Error('At least one contact method (email or phone) is required')
    }
    
    return true
  }
} 