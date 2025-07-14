import { supabase } from './supabase'
import type { Person, Note, Task, FollowUp, Activity, File } from './supabase'

// Role management utilities
export const getAdminDomains = (): string[] => {
  const domains = process.env.NEXT_PUBLIC_ADMIN_DOMAINS
  return domains ? domains.split(',').map(d => d.trim()) : []
}

export const assignUserRole = async (userId: string, email: string): Promise<'admin' | 'agent'> => {
  const adminDomains = getAdminDomains()
  const userDomain = email?.split('@')[1]
  
  // Check if user's email domain is in admin domains
  const role = adminDomains.includes(userDomain || '') ? 'admin' : 'agent'
  
  // Create or update user record with assigned role
  const { error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: email,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  
  if (error) {
    console.error('Error assigning user role:', error)
    throw error
  }
  
  return role
}

export const updateUserRole = async (userId: string, newRole: 'admin' | 'agent'): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating user role:', error)
    throw error
  }
}

// People/Contacts
export async function getPeople(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select('*')
    .order('last_interaction', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPerson(id: string) {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function getPersonById(id: string, userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select('*')
    .eq('id', id)
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query.single()
  if (error) throw error
  return data
}

export async function deletePerson(id: string) {
  // First, delete all related records
  const { error: activitiesError } = await supabase
    .from('activities')
    .delete()
    .eq('person_id', id)
  
  if (activitiesError) {
    console.error('Error deleting activities:', activitiesError)
    throw activitiesError
  }

  const { error: notesError } = await supabase
    .from('notes')
    .delete()
    .eq('person_id', id)
  
  if (notesError) {
    console.error('Error deleting notes:', notesError)
    throw notesError
  }

  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('person_id', id)
  
  if (tasksError) {
    console.error('Error deleting tasks:', tasksError)
    throw tasksError
  }

  const { error: followUpsError } = await supabase
    .from('follow_ups')
    .delete()
    .eq('person_id', id)
  
  if (followUpsError) {
    console.error('Error deleting follow-ups:', followUpsError)
    throw followUpsError
  }

  const { error: filesError } = await supabase
    .from('files')
    .delete()
    .eq('person_id', id)
  
  if (filesError) {
    console.error('Error deleting files:', filesError)
    throw filesError
  }

  // Finally, delete the person
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function createPerson(personData: Partial<Person>) {
  const { data, error } = await supabase
    .from('people')
    .insert([personData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updatePerson(id: string, updates: Partial<Person>) {
  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Notes
export async function getNotes(personId?: string) {
  let query = supabase.from('notes').select('*').order('created_at', { ascending: false })
  
  if (personId) {
    query = query.eq('person_id', personId)
  } else {
    query = query.is('person_id', null) // System-wide notes only
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createNote(noteData: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .insert([noteData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateNote(id: string, updates: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteNote(id: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Tasks
export async function getTasks(personId?: string, userId?: string, userRole?: string) {
  let query = supabase.from('tasks').select('*').order('due_date', { ascending: true })
  
  if (personId) {
    query = query.eq('person_id', personId)
  } else if (userRole === 'agent' && userId) {
    // If no specific person, show only tasks assigned to the agent
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createTask(taskData: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Follow-ups
export async function getFollowUps(userId?: string, userRole?: string) {
  let query = supabase
    .from('follow_ups')
    .select(`
      *,
      people (
        id,
        first_name,
        last_name,
        assigned_to
      )
    `)
    .order('scheduled_date', { ascending: true })
  
  // If user is an agent, only show follow-ups for assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('people.assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createFollowUp(followUpData: Partial<FollowUp>) {
  const { data, error } = await supabase
    .from('follow_ups')
    .insert([followUpData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateFollowUp(id: string, updates: Partial<FollowUp>) {
  const { data, error } = await supabase
    .from('follow_ups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteFollowUp(id: string) {
  const { error } = await supabase
    .from('follow_ups')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Activities
export async function getActivities(personId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createActivity(activityData: Partial<Activity>) {
  const { data, error } = await supabase
    .from('activities')
    .insert([activityData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Users
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createUser(userData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateUser(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Properties
export async function getProperties(personId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createProperty(propertyData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('properties')
    .insert([propertyData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Lists
export async function getLists() {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data || []
}

// Round Robin Functions
export async function getRoundRobinConfig() {
  const { data, error } = await supabase
    .from('round_robin_config')
    .select('*')
    .order('priority', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function addUserToRoundRobin(userId: string) {
  const { data, error } = await supabase
    .from('round_robin_config')
    .insert([{ user_id: userId }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function removeUserFromRoundRobin(userId: string) {
  const { error } = await supabase
    .from('round_robin_config')
    .delete()
    .eq('user_id', userId)
  
  if (error) throw error
}

export async function updateRoundRobinStatus(userId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('round_robin_config')
    .update({ is_active: isActive })
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getNextRoundRobinUser() {
  const { data, error } = await supabase
    .rpc('get_next_round_robin_user')
  
  if (error) throw error
  return data
}

export async function assignLeadToUser(leadData: Partial<Person>, userId: string) {
  const { data, error } = await supabase
    .from('people')
    .insert([{ ...leadData, assigned_to: userId }])
    .select()
    .single()
  
  if (error) throw error
  return data
} 

// Test lead creation for admin testing
export async function createTestLead(leadData: {
  firstName: string
  lastName: string
  email: string
  phone: string
  source: string
  notes: string
}) {
  try {
    // Get next user in Round Robin
    const assignedUserId = await getNextRoundRobinUser()
    
    const personData: Partial<Person> = {
      first_name: leadData.firstName,
      last_name: leadData.lastName,
      email: [leadData.email],
      phone: [leadData.phone],
      client_type: 'lead',
      lead_source: leadData.source,
      assigned_to: assignedUserId,
      notes: leadData.notes,
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
      address: undefined,
      city: undefined,
      state: undefined,
      zip_code: undefined,
      country: undefined,
      looking_for: undefined,
      selling: undefined,
      closed: undefined,
    }
    
    const newPerson = await createPerson(personData)
    
    // Create an activity log entry
    await createActivity({
      person_id: newPerson.id,
      type: 'created',
      description: `Test lead created from admin panel`,
      created_by: assignedUserId || '00000000-0000-0000-0000-000000000000',
    })
    
    return {
      success: true,
      leadId: newPerson.id,
      assignedTo: assignedUserId
    }
    
  } catch (error) {
    console.error('Error creating test lead:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test lead'
    }
  }
}

// Dashboard statistics
// Files
export async function getFiles(personId?: string) {
  let query = supabase.from('files').select('*').order('created_at', { ascending: false })
  
  if (personId) {
    query = query.eq('person_id', personId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createFile(fileData: Partial<File>) {
  const { data, error } = await supabase
    .from('files')
    .insert([fileData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteFile(id: string) {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getDashboardStats(): Promise<{
  totalPeople: number
  totalLeads: number
  totalFollowUps: number
  totalTasks: number
}> {
  try {
    // Get counts for different entities
    const [people, followUps, tasks] = await Promise.all([
      getPeople(),
      getFollowUps(),
      getTasks()
    ])
    
    const totalLeads = people.filter(p => p.client_type === 'lead').length
    
    return {
      totalPeople: people.length,
      totalLeads,
      totalFollowUps: followUps.length,
      totalTasks: tasks.length
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalPeople: 0,
      totalLeads: 0,
      totalFollowUps: 0,
      totalTasks: 0
    }
  }
} 