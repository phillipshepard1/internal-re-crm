import { supabase } from './supabase'

export interface LeadData {
  first_name: string
  last_name: string
  email: string[]
  phone: string[]
  company?: string
  position?: string
  client_type: 'lead'
  lead_source: string
}

/**
 * Get the next user in the Round Robin queue
 */
export async function getNextRoundRobinUser(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, is_active, round_robin_priority')
      .eq('is_active', true)
      .eq('role', 'agent')
      .order('round_robin_priority', { ascending: true })
      .limit(1)

    if (error) {
      throw error
    }

    return data?.[0]?.id || null
  } catch (error) {
    return null
  }
}

/**
 * Update Round Robin priority to move user to end of queue
 */
async function updateRoundRobinPriority(userId: string): Promise<void> {
  try {
    // Get the highest priority in the queue
    const { data: maxPriorityData } = await supabase
      .from('round_robin_config')
      .select('priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)

    const maxPriority = maxPriorityData?.[0]?.priority || 0
    const newPriority = maxPriority + 1

    // Update the user's priority
    await supabase
      .from('round_robin_config')
      .update({ priority: newPriority })
      .eq('user_id', userId)
  } catch (error) {
    console.error('Error updating Round Robin priority:', error)
  }
}

/**
 * Assign a lead to a specific user via Round Robin
 */
export async function assignLeadToRoundRobin(leadData: LeadData): Promise<boolean> {
  try {
    const assignedUserId = await getNextRoundRobinUser()
    
    if (!assignedUserId) {
      return false
    }

    // Create the person record with the assigned user
    const { createPerson } = await import('./database')
    const personData = {
      ...leadData,
      assigned_to: assignedUserId,
      last_interaction: new Date().toISOString(),
      next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    }

    const newPerson = await createPerson(personData)
    
    // Create an activity log entry
    const { createActivity } = await import('./database')
    await createActivity({
      person_id: newPerson.id,
      type: 'created',
      description: `Lead assigned via Round Robin`,
      created_by: assignedUserId,
    })


    return true
  } catch (error) {
    console.error('Error assigning lead via Round Robin:', error)
    return false
  }
}

export class RoundRobinService {
  /**
   * Assigns a new lead to the next available user in the Round Robin queue
   */
  static async assignLead(leadData: LeadData): Promise<boolean> {
    try {
      // Get the next user in the Round Robin queue
      const nextUserId = await getNextRoundRobinUser()
      
      if (!nextUserId) {
        return false
      }
      
      // Create the person record and assign to the user
      const { createPerson } = await import('./database')
      const personData = {
        ...leadData,
        assigned_to: nextUserId,
        last_interaction: new Date().toISOString(),
        next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      }
      
      const newPerson = await createPerson(personData)
      
      // Create an activity log entry
      const { createActivity } = await import('./database')
      await createActivity({
        person_id: newPerson.id,
        type: 'created',
        description: `Lead assigned via Round Robin`,
        created_by: nextUserId,
      })

  
      return true
      
    } catch (error) {
      console.error('Error assigning lead via Round Robin:', error)
      return false
    }
  }
  
  /**
   * Processes multiple leads in batch
   */
  static async assignLeadsBatch(leadsData: LeadData[]): Promise<boolean[]> {
    const assignedLeads: boolean[] = []
    
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