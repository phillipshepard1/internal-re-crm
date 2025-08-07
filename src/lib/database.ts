import { supabase } from './supabase'
import type { Person, Note, Task, FollowUp, FollowUpWithPerson, Activity, File, LeadTag, FollowUpPlanTemplate, FollowUpPlanStep } from './supabase'

// Database connection test
export async function testDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const startTime = Date.now()
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return { connected: false, error: error.message }
    }
    
    return { connected: true }
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Simple function to get user role from database
export async function getUserRole(userId: string): Promise<'admin' | 'agent'> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data?.role) {
    // If user doesn't exist or has no role, create them with 'agent' role
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        role: 'agent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    
    if (upsertError) {
      // Error creating user
    }
    
    return 'agent'
  }

  return data.role as 'admin' | 'agent'
}

// Role management utilities
export const assignUserRole = async (userId: string, email: string): Promise<'agent'> => {
  // Always assign 'agent' role to new users
  const { error } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: email,
      role: 'agent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  
  if (error) {
    // Error assigning user role
    throw error
  }
  
  return 'agent'
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
    // Error updating user role
    throw error
  }
}

// People/Contacts - for /people page (converted leads + non-leads)
export async function getPeople(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .or('client_type.neq.lead,lead_status.eq.converted') // Include non-leads and converted leads only
    .order('last_interaction', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Get all people including leads (for admin purposes)
export async function getAllPeople(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .order('last_interaction', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Get people for Follow-up Frequency Management (assigned leads + non-leads, excluding staging)
export async function getPeopleForFollowUpManagement(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    // Include all people except staging leads (not assigned to agents yet)
    .neq('lead_status', 'staging')
    // Only show people who are actually assigned to agents
    .not('assigned_to', 'is', null)
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
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      ),
      lead_tag:lead_tag_id (
        id,
        name,
        color,
        description
      ),
      follow_up_plan:follow_up_plan_id (
        id,
        name,
        description
      ),
      assigned_by_user:users!assigned_by (
        id,
        email,
        first_name,
        last_name
      )
    `)
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
    // Error deleting activities
    throw activitiesError
  }

  const { error: notesError } = await supabase
    .from('notes')
    .delete()
    .eq('person_id', id)
  
  if (notesError) {
    // Error deleting notes
    throw notesError
  }

  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('person_id', id)
  
  if (tasksError) {
    // Error deleting tasks
    throw tasksError
  }

  const { error: followUpsError } = await supabase
    .from('follow_ups')
    .delete()
    .eq('person_id', id)
  
  if (followUpsError) {
    // Error deleting follow-ups
    throw followUpsError
  }

  const { error: filesError } = await supabase
    .from('files')
    .delete()
    .eq('person_id', id)
  
  if (filesError) {
    // Error deleting files
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
  // Validate required fields
  if (!personData.first_name || !personData.first_name.trim()) {
    throw new Error('First name is required')
  }
  
  if (!personData.last_name || !personData.last_name.trim()) {
    throw new Error('Last name is required')
  }
  
  if (!personData.assigned_to) {
    throw new Error('Assigned user is required')
  }
  
  // Clean up the data
  const cleanData = {
    ...personData,
    first_name: personData.first_name.trim(),
    last_name: personData.last_name.trim(),
    email: Array.isArray(personData.email) ? personData.email.filter(e => e && e.trim()) : [],
    phone: Array.isArray(personData.phone) ? personData.phone.filter(p => p && p.trim()) : []
  }
  
  const { data, error } = await supabase
    .from('people')
    .insert([cleanData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Check if a person exists by email
export async function checkPersonExistsByEmail(email: string, userId?: string, userRole?: string): Promise<Person | null> {
  if (!email || !email.trim()) {
    return null
  }

  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .contains('email', [email.trim().toLowerCase()])
  
  // If user is an agent, only check contacts assigned to them
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error checking for existing person:', error)
    return null
  }
  
  // Return the first match (should be only one if email is unique)
  return data && data.length > 0 ? data[0] : null
}

// Check if a person exists by email (for import purposes - checks all contacts regardless of assignment)
export async function checkPersonExistsByEmailForImport(email: string): Promise<Person | null> {
  if (!email || !email.trim()) {
    return null
  }

  const emailToCheck = email.trim().toLowerCase()
  console.log('Checking for email:', emailToCheck)
  
  // Get all contacts and filter in JavaScript since Supabase array contains might not work as expected
  const { data, error } = await supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .limit(1000) // Limit to prevent performance issues
  
  if (error) {
    console.error('Error checking for existing person:', error)
    return null
  }
  
  // Debug: log some sample emails from the database
  if (data && data.length > 0) {
    console.log('Sample emails from database:', data.slice(0, 3).map(p => ({
      name: `${p.first_name} ${p.last_name}`,
      emails: p.email
    })))
  }
  
  // Filter contacts that have the email in their email array
  const matchingContacts = data?.filter(person => 
    person.email && 
    Array.isArray(person.email) && 
    person.email.some((e: string | null) => e && e.toLowerCase() === emailToCheck)
  ) || []
  
  console.log(`Found ${matchingContacts.length} contacts for email ${emailToCheck}`)
  if (matchingContacts.length > 0) {
    console.log('Existing contact:', {
      id: matchingContacts[0].id,
      name: `${matchingContacts[0].first_name} ${matchingContacts[0].last_name}`,
      emails: matchingContacts[0].email
    })
  }
  
  // Return the first match (should be only one if email is unique)
  return matchingContacts.length > 0 ? matchingContacts[0] : null
}

// Check multiple emails for existing contacts (for import purposes)
export async function checkMultipleEmailsExistForImport(emails: string[]): Promise<Map<string, Person>> {
  const existingContacts = new Map<string, Person>()
  
  // Check each email individually since Supabase doesn't support OR queries with contains
  for (const email of emails) {
    if (email && email.trim()) {
      const existing = await checkPersonExistsByEmailForImport(email.trim())
      if (existing) {
        existingContacts.set(email.trim().toLowerCase(), existing)
      }
    }
  }
  
  return existingContacts
}

// Check multiple emails for existing contacts
export async function checkMultipleEmailsExist(emails: string[], userId?: string, userRole?: string): Promise<Map<string, Person>> {
  const existingContacts = new Map<string, Person>()
  
  // Check each email individually since Supabase doesn't support OR queries with contains
  for (const email of emails) {
    if (email && email.trim()) {
      const existing = await checkPersonExistsByEmail(email.trim(), userId, userRole)
      if (existing) {
        existingContacts.set(email.trim().toLowerCase(), existing)
      }
    }
  }
  
  return existingContacts
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
  let query = supabase
    .from('tasks')
    .select(`
      *,
      people!person_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('due_date', { ascending: true })
  
  // Exclude follow-up tasks (tasks created from follow-ups)
  query = query.not('title', 'ilike', 'Follow-up:%')
  
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
export async function getFollowUps(userId?: string, userRole?: string): Promise<FollowUpWithPerson[]> {
  let query = supabase
    .from('follow_ups')
    .select(`
      id,
      person_id,
      scheduled_date,
      status,
      notes,
      created_at,
      updated_at,
      type,
      people!person_id (
        id,
        first_name,
        last_name,
        email,
        phone,
        assigned_to,
        lead_tag_id,
        lead_tag:lead_tag_id (
          id,
          name,
          color,
          description
        )
      )
    `)
    .order('scheduled_date', { ascending: true })
  
  const { data, error } = await query
  if (error) throw error
  
  // Filter follow-ups based on the person's assigned_to field
  // Both agents and admins only see follow-ups for people assigned to them
  let filteredData = data || []
  
  if (userId) {
    filteredData = (data || []).filter((followUp: any) => {
      const person = followUp.people
      return person && person.assigned_to === userId
    })
  }
  
  // Debug: Log orphaned follow-ups
  const orphanedFollowUps = filteredData.filter((item: any) => {
    const people = Array.isArray(item.people) ? item.people[0] : item.people
    return !people || !people.id || !people.first_name || !people.last_name
  })
  
  if (orphanedFollowUps.length > 0) {
    console.warn('Found orphaned follow-ups:', orphanedFollowUps.map(fu => ({
      id: fu.id,
      person_id: fu.person_id,
      scheduled_date: fu.scheduled_date,
      people: fu.people
    })))
  }
  
  // Transform the data to match FollowUpWithPerson type and filter out orphaned follow-ups
  const transformedData = filteredData
    .map((item: any) => ({
      ...item,
      people: Array.isArray(item.people) ? item.people[0] : item.people
    }))
    .filter((item: FollowUpWithPerson) => {
      // Filter out follow-ups that don't have valid people data
      return item.people && item.people.id && item.people.first_name && item.people.last_name
    })
  
  return transformedData
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
  
  // If follow-up is being marked as completed, create a task automatically
  if (updates.status === 'completed' && data) {
    try {
      await createTaskFromFollowUp(data)
    } catch (taskError) {
      // Failed to create task from follow-up
    }
  }
  
  return data
}

// Automatically create a task when a follow-up is completed
async function createTaskFromFollowUp(followUp: FollowUp) {
  if (!followUp.person_id) return
  
  // Get the person details
  const person = await getPersonById(followUp.person_id)
  if (!person) return
  
  // Create a task based on the follow-up
  const taskTitle = `Follow-up: ${person.first_name} ${person.last_name}`
  const taskDescription = `Follow-up completed on ${new Date().toLocaleDateString()}. Type: ${followUp.type}`
  
  // Set due date to 1 week from now
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)
  
  await createTask({
    title: taskTitle,
    description: taskDescription,
    person_id: followUp.person_id,
    assigned_to: person.assigned_to,
    due_date: dueDate.toISOString(),
    status: 'pending',
  })
  
  // Create activity log for task creation
  await createActivity({
    person_id: followUp.person_id,
    type: 'task_added',
    description: `Task created from completed follow-up`,
    created_by: person.assigned_to,
  })
}

export async function deleteFollowUp(id: string) {
  const { error } = await supabase
    .from('follow_ups')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Function to clean up orphaned follow-ups (follow-ups without valid people records)
export async function cleanupOrphanedFollowUps(): Promise<number> {
  try {
    // Use a simpler approach: get all follow-ups and filter in JavaScript
    const { data: allFollowUps, error: followupError } = await supabase
      .from('follow_ups')
      .select('id, person_id')
    
    if (followupError) throw followupError
    
    if (!allFollowUps || allFollowUps.length === 0) {
      return 0
    }
    
    // Get all people IDs
    const { data: peopleIds, error: peopleError } = await supabase
      .from('people')
      .select('id')
    
    if (peopleError) throw peopleError
    
    const validPersonIds = new Set(peopleIds?.map(p => p.id) || [])
    
    // Find orphaned follow-ups
    const orphanedFollowUps = allFollowUps.filter(fu => !validPersonIds.has(fu.person_id))
    
    if (orphanedFollowUps.length > 0) {
      console.warn(`Found ${orphanedFollowUps.length} orphaned follow-ups to clean up`)
      
      // Delete the orphaned follow-ups
      const { error: deleteError } = await supabase
        .from('follow_ups')
        .delete()
        .in('id', orphanedFollowUps.map(fu => fu.id))
      
      if (deleteError) throw deleteError
      
      console.log(`Successfully cleaned up ${orphanedFollowUps.length} orphaned follow-ups`)
      return orphanedFollowUps.length
    }
    
    return 0
  } catch (error) {
    console.error('Error cleaning up orphaned follow-ups:', error)
    throw error
  }
}

// Function to validate people data and identify issues
export async function validatePeopleData(): Promise<Array<{person_id: string, issue: string}>> {
  try {
    const { data, error } = await supabase.rpc('validate_people_data')
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error validating people data:', error)
    throw error
  }
}

// Function to clean up invalid people records
export async function cleanupInvalidPeople(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_invalid_people')
    
    if (error) throw error
    
    return data || 0
  } catch (error) {
    console.error('Error cleaning up invalid people:', error)
    throw error
  }
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

// System-wide activities for admin dashboard
export async function getAllActivities(limit: number = 100) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      people (
        id,
        first_name,
        last_name,
        assigned_to
      ),
      users:created_by (
        id,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// Get activities by user
export async function getActivitiesByUser(userId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      people (
        id,
        first_name,
        last_name,
        assigned_to
      )
    `)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

// Get recent activities for dashboard
export async function getRecentActivities(limit: number = 20) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      people (
        id,
        first_name,
        last_name,
        assigned_to
      ),
      users:created_by (
        id,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export async function getUserRecentActivities(userId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      people (
        id,
        first_name,
        last_name,
        assigned_to
      ),
      users:created_by (
        id,
        email
      )
    `)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
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
    // Error creating test lead
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

export async function getDashboardStats(userId?: string, userRole?: string): Promise<{
  totalPeople: number
  totalLeads: number
  totalFollowUps: number
  totalTasks: number
}> {
  try {
    // Get counts for different entities - both agents and admins see only their assigned items
    const [people, followUps, tasks] = await Promise.all([
      getPeople(userId, userRole),
      getFollowUps(userId, userRole),
      getTasks(userId, userRole)
    ])
    
    const totalLeads = people.filter(p => p.client_type === 'lead').length
    
    return {
      totalPeople: people.length,
      totalLeads,
      totalFollowUps: followUps.length,
      totalTasks: tasks.length
    }
  } catch (error) {
    // Error getting dashboard stats
    return {
      totalPeople: 0,
      totalLeads: 0,
      totalFollowUps: 0,
      totalTasks: 0
    }
  }
}

// Enhanced admin dashboard statistics
export async function getAdminDashboardStats(): Promise<{
  totalPeople: number
  totalLeads: number
  totalFollowUps: number
  totalTasks: number
  totalActivities: number
  recentActivities: number
  pendingFollowUps: number
  overdueFollowUps: number
  userStats: Array<{
    userId: string
    email: string
    role: string
    assignedPeople: number
    assignedLeads: number
    completedFollowUps: number
    pendingTasks: number
  }>
}> {
  try {
    // Get all data - admins see everything
    const [people, followUps, tasks, activities, users] = await Promise.all([
      getAllPeople(), // Use getAllPeople to get all data for admin
      getFollowUps(), // Admin sees all follow-ups
      getTasks(), // Admin sees all tasks
      getAllActivities(1000), // Get more activities for stats
      getUsers()
    ])
    
    const totalLeads = people.filter(p => p.client_type === 'lead').length
    const pendingFollowUps = followUps.filter(f => f.status === 'pending').length
    const overdueFollowUps = followUps.filter(f => 
      f.status === 'pending' && new Date(f.scheduled_date) < new Date()
    ).length
    const recentActivities = activities.filter(a => 
      new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    ).length
    
    // Calculate user statistics
    const userStats = users.map(user => {
      const assignedPeople = people.filter(p => p.assigned_to === user.id).length
      const assignedLeads = people.filter(p => p.assigned_to === user.id && p.client_type === 'lead').length
      const completedFollowUps = followUps.filter(f => 
        f.people?.assigned_to === user.id && f.status === 'completed'
      ).length
      const pendingTasks = tasks.filter(t => 
        t.assigned_to === user.id && t.status === 'pending'
      ).length
      
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        assignedPeople,
        assignedLeads,
        completedFollowUps,
        pendingTasks
      }
    })
    
    return {
      totalPeople: people.length,
      totalLeads,
      totalFollowUps: followUps.length,
      totalTasks: tasks.length,
      totalActivities: activities.length,
      recentActivities,
      pendingFollowUps,
      overdueFollowUps,
      userStats
    }
  } catch (error) {
    // Error getting admin dashboard stats
    return {
      totalPeople: 0,
      totalLeads: 0,
      totalFollowUps: 0,
      totalTasks: 0,
      totalActivities: 0,
      recentActivities: 0,
      pendingFollowUps: 0,
      overdueFollowUps: 0,
      userStats: []
    }
  }
} 

// Lead Management Functions
export async function getLeads(status?: 'staging' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost', userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .order('created_at', { ascending: false })
  
  // Filter by lead status if provided
  if (status) {
    query = query.eq('lead_status', status)
  }
  
  // If user is an agent, only show assigned leads
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getStagingLeads() {
  const { data, error } = await supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .eq('lead_status', 'staging')
    .is('archived_at', null) // Exclude archived leads
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getAssignedLeads(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      ),
      assigned_by_user:users!assigned_by (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .in('lead_status', ['assigned', 'contacted', 'qualified', 'lost'])
    .is('archived_at', null) // Exclude archived leads
    .order('created_at', { ascending: false })
  
  // If user is an agent, only show their assigned leads
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getArchivedLeads(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      ),
      assigned_by_user:users!assigned_by (
        id,
        email,
        first_name,
        last_name
      ),
      archived_by_user:users!archived_by (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .not('archived_at', 'is', null) // Only archived leads
    .order('archived_at', { ascending: false })
  
  // If user is an agent, only show their assigned archived leads
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function assignLeadToUser(leadId: string, userId: string, assignedBy?: string) {
  // Get the "Warm" tag ID for auto-tagging
  const { data: warmTag, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('name', 'Warm')
    .eq('is_active', true)
    .single()

  if (tagError) {
    console.error('Error getting Warm tag:', tagError)
    // Continue without auto-tagging if we can't get the tag
  }

  const { data, error } = await supabase
    .from('people')
    .update({
      assigned_to: userId,
      lead_status: 'assigned',
      assigned_by: assignedBy || userId, // Use assignedBy if provided, otherwise fallback to userId
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lead_tag_id: warmTag?.id || null // Auto-tag as "Warm"
    })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) throw error
  
  // Create activity log
  await createActivity({
    person_id: leadId,
    type: 'assigned',
    description: `Lead assigned to user`,
    created_by: userId,
  })
  
  // Create initial follow-up for next day (if not already created)
  try {
    const { data: followUpData, error: followUpError } = await supabase.rpc('create_initial_followup_for_person', {
      person_id: leadId
    })
    
    if (followUpError) {
      console.error('Error creating initial follow-up:', followUpError)
      // Don't fail the assignment if follow-up creation fails
    } else {
      // Mark that this person has had their initial follow-up
      await updatePerson(leadId, {
        has_initial_followup: true
      })
    }
  } catch (followUpError) {
    console.error('Error creating initial follow-up:', followUpError)
    // Don't fail the assignment if follow-up creation fails
  }
  
  return data
}

export async function updateLeadStatus(leadId: string, status: 'staging' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost', userId: string) {
  const updateData: any = {
    lead_status: status,
    updated_at: new Date().toISOString()
  }

  // If lead is converted, change client_type to 'client'
  if (status === 'converted') {
    updateData.client_type = 'client'
  }

  const { data, error } = await supabase
    .from('people')
    .update(updateData)
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) throw error
  
  // Create activity log
  await createActivity({
    person_id: leadId,
    type: 'status_changed',
    description: `Lead status changed to ${status}`,
    created_by: userId,
  })
  
  return data
}

export async function getUsersForAssignment() {
  // First, let's see ALL users in the database
  const { data: allUsers, error: allUsersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .order('first_name', { ascending: true })
  
  if (allUsersError) {
    // Error getting all users
  }
  
  // Now get users for assignment (agents and admins)
  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .in('role', ['agent', 'admin'])
    .order('first_name', { ascending: true })
  
  if (error) {
    // Error getting users for assignment
    throw error
  }
  
  return data || []
}

export async function getLeadStats(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select('lead_status, client_type')
    .eq('client_type', 'lead')
    .not('lead_status', 'is', null)
  
  // If user is an agent, only show their stats
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Group by status
  const stats = {
    staging: 0,
    assigned: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    total: 0
  }
  
  data?.forEach((item: any) => {
    if (item.lead_status && stats.hasOwnProperty(item.lead_status)) {
      stats[item.lead_status as keyof typeof stats]++
      stats.total++
    }
  })
  
  return stats
} 

// Lead Tag Management Functions
export async function getLeadTags(): Promise<LeadTag[]> {
  const { data, error } = await supabase
    .from('lead_tags')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createLeadTag(tagData: Partial<LeadTag>): Promise<LeadTag> {
  const { data, error } = await supabase
    .from('lead_tags')
    .insert([tagData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateLeadTag(id: string, updates: Partial<LeadTag>): Promise<LeadTag> {
  const { data, error } = await supabase
    .from('lead_tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteLeadTag(id: string): Promise<void> {
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Follow-up Plan Template Management Functions
export async function getFollowUpPlanTemplates(): Promise<(FollowUpPlanTemplate & { steps?: FollowUpPlanStep[] })[]> {
  const { data, error } = await supabase
    .from('follow_up_plan_templates')
    .select(`
      *,
      steps:follow_up_plan_steps(*)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) throw error
  
  // Sort steps by order for each plan
  const plansWithSteps = (data || []).map((plan: any) => ({
    ...plan,
    steps: plan.steps ? plan.steps.sort((a: FollowUpPlanStep, b: FollowUpPlanStep) => a.step_order - b.step_order) : []
  }))
  
  return plansWithSteps
}

export async function getFollowUpPlanTemplate(id: string): Promise<FollowUpPlanTemplate & { steps: FollowUpPlanStep[] }> {
  const { data, error } = await supabase
    .from('follow_up_plan_templates')
    .select(`
      *,
      steps:follow_up_plan_steps(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  // Sort steps by order
  const sortedSteps = (data.steps || []).sort((a: FollowUpPlanStep, b: FollowUpPlanStep) => a.step_order - b.step_order)
  
  return {
    ...data,
    steps: sortedSteps
  }
}

export async function createFollowUpPlanTemplate(planData: Partial<FollowUpPlanTemplate>): Promise<FollowUpPlanTemplate> {
  const { data, error } = await supabase
    .from('follow_up_plan_templates')
    .insert([planData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateFollowUpPlanTemplate(id: string, updates: Partial<FollowUpPlanTemplate>): Promise<FollowUpPlanTemplate> {
  const { data, error } = await supabase
    .from('follow_up_plan_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteFollowUpPlanTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('follow_up_plan_templates')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Follow-up Plan Steps Management
export async function createFollowUpPlanStep(stepData: Partial<FollowUpPlanStep>): Promise<FollowUpPlanStep> {
  const { data, error } = await supabase
    .from('follow_up_plan_steps')
    .insert([stepData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateFollowUpPlanStep(id: string, updates: Partial<FollowUpPlanStep>): Promise<FollowUpPlanStep> {
  const { data, error } = await supabase
    .from('follow_up_plan_steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteFollowUpPlanStep(id: string): Promise<void> {
  const { error } = await supabase
    .from('follow_up_plan_steps')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Apply simplified follow-up frequency to a lead
export async function applyFollowUpFrequencyToLead(leadId: string, frequency: 'twice_week' | 'weekly' | 'biweekly' | 'monthly', dayOfWeek: number = 1, assignedUserId: string): Promise<void> {
  try {
    // Update the lead with the frequency settings
    await updatePerson(leadId, {
      follow_up_frequency: frequency,
      follow_up_day_of_week: dayOfWeek,
      assigned_at: new Date().toISOString(),
      has_initial_followup: false // Reset flag for new assignment
    })
    
    // Create the INITIAL follow-up for the next day (regardless of frequency)
    const { data, error } = await supabase.rpc('create_initial_followup_for_person', {
      person_id: leadId
    })
    
    if (error) {
      console.error('Error creating initial follow-up:', error)
      throw error
    }
    
    // Mark that this person has had their initial follow-up
    await updatePerson(leadId, {
      has_initial_followup: true
    })
    
    // Create activity log
    await createActivity({
      person_id: leadId,
      type: 'follow_up',
      description: `Initial follow-up scheduled for next day. Frequency set to ${frequency} (${getFrequencyDisplayName(frequency)}) for subsequent follow-ups.`,
      created_by: assignedUserId,
    })
    
  } catch (error) {
    throw error
  }
}

// Helper function to get display name for frequency
export function getFrequencyDisplayName(frequency: 'twice_week' | 'weekly' | 'biweekly' | 'monthly'): string {
  const names = {
    twice_week: 'Twice a Week',
    weekly: 'Every Week',
    biweekly: 'Every 2 Weeks',
    monthly: 'Every Month'
  }
  return names[frequency] || frequency
}

// Get day of week display name
export function getDayOfWeekDisplayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day] || 'Monday'
}

// Legacy function for backward compatibility
export async function applyFollowUpPlanToLead(leadId: string, planId: string, assignedUserId: string): Promise<void> {
  // For now, just apply weekly frequency as default
  await applyFollowUpFrequencyToLead(leadId, 'weekly', 1, assignedUserId)
}

// Update lead tag for a specific lead
export async function updateLeadTagForLead(leadId: string, tagId: string | null, userId: string): Promise<void> {
  const updateData: any = {
    lead_tag_id: tagId,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('people')
    .update(updateData)
    .eq('id', leadId)
  
  if (error) throw error
  
  // Get tag name for activity log
  let tagName = 'None'
  if (tagId) {
    const { data: tag } = await supabase
      .from('lead_tags')
      .select('name')
      .eq('id', tagId)
      .single()
    tagName = tag?.name || 'Unknown'
  }
  
  // Create activity log
  await createActivity({
    person_id: leadId,
    type: 'status_changed',
    description: `Lead tag updated to: ${tagName}`,
    created_by: userId,
  })
}

// Enhanced lead functions with new fields
export async function getLeadsWithTags(status?: 'staging' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost', userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      ),
      lead_tag:lead_tag_id (
        id,
        name,
        color,
        description
      ),
      follow_up_plan:follow_up_plan_id (
        id,
        name,
        description
      ),
      assigned_by_user:users!assigned_by (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .order('created_at', { ascending: false })
  
  // Filter by lead status if provided
  if (status) {
    query = query.eq('lead_status', status)
  }
  
  // For "My Leads" page, both agents and admins should only see leads assigned to them
  // and exclude staging leads (they should only be in admin panel)
  if (userId) {
    query = query.eq('assigned_to', userId).neq('lead_status', 'staging')
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Get converted leads only (for Converted Leads tab)
export async function getConvertedLeads(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .eq('lead_status', 'converted')
    .order('last_interaction', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Get imported leads (people with lead_source = 'csv_import')
export async function getImportedLeads(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('lead_source', 'csv_import')
    .eq('client_type', 'lead')
    .neq('lead_status', 'converted')
    .order('created_at', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Get regular people (non-leads, excluding converted leads)
export async function getRegularPeople(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .or('client_type.is.null,client_type.neq.lead')
    .order('last_interaction', { ascending: false })
  
  // If user is an agent, only show assigned contacts
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Bulk convert people to leads
export async function bulkConvertPeopleToLeads(personIds: string[], userId: string) {
  const { data, error } = await supabase
    .from('people')
    .update({
      client_type: 'lead',
      lead_status: 'staging',
      lead_source: 'csv_import',
      assigned_to: userId,
      updated_at: new Date().toISOString()
    })
    .in('id', personIds)
    .select()

  if (error) throw error
  return data || []
}

// Get leads by tag
export async function getLeadsByTag(tagName: string, userId?: string, userRole?: string): Promise<Person[]> {
  // First, get the tag ID for the given tag name
  const { data: tagData, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('name', tagName)
    .eq('is_active', true)
    .single()
  
  if (tagError || !tagData) {
    return []
  }
  
  let query = supabase
    .from('people')
    .select(`
      *,
      assigned_user:assigned_to (
        id,
        email,
        first_name,
        last_name
      ),
      lead_tag:lead_tag_id (
        id,
        name,
        color,
        description
      ),
      follow_up_plan:follow_up_plan_id (
        id,
        name,
        description
      ),
      assigned_by_user:users!assigned_by (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('client_type', 'lead')
    .eq('lead_tag_id', tagData.id)
    .order('created_at', { ascending: false })
  
  // For "My Leads" page, both agents and admins should only see leads assigned to them
  // and exclude staging leads (they should only be in admin panel)
  if (userId) {
    query = query.eq('assigned_to', userId).neq('lead_status', 'staging')
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Enhanced lead stats with tags
export async function getLeadStatsWithTags(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select(`
      lead_status,
      client_type,
      lead_tag:lead_tag_id (
        id,
        name,
        color
      )
    `)
    .eq('client_type', 'lead')
    .not('lead_status', 'is', null)
  
  // For "My Leads" page, both agents and admins should only show their stats
  // and exclude staging leads (they should only be in admin panel)
  if (userId) {
    query = query.eq('assigned_to', userId).neq('lead_status', 'staging')
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Group by status and tags
  const stats = {
    staging: 0,
    assigned: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    total: 0,
    tags: {
      hot: 0,
      warm: 0,
      cold: 0,
      dead: 0,
      untagged: 0
    }
  }
  
  data?.forEach((item: any) => {
    if (item.lead_status && stats.hasOwnProperty(item.lead_status)) {
      stats[item.lead_status as keyof typeof stats]++
      stats.total++
    }
    
    // Count by tags
    if (item.lead_tag) {
      const tagName = item.lead_tag.name.toLowerCase()
      if (stats.tags.hasOwnProperty(tagName)) {
        stats.tags[tagName as keyof typeof stats.tags]++
      }
    } else {
      stats.tags.untagged++
    }
  })
  
  return stats
} 

// Lead source detection functions
export async function detectLeadSourceFromEmail(fromEmail: string): Promise<{ id: string; name: string } | null> {
  try {
    const { data: leadSources, error } = await supabase
      .from('lead_sources')
      .select('id, name, email_patterns, domain_patterns')
      .eq('is_active', true)
    
    if (error) throw error
    
    if (!leadSources || leadSources.length === 0) {
      return null
    }
    
    // Check each lead source for matches
    for (const source of leadSources) {
      // Check email patterns
      if (source.email_patterns && source.email_patterns.length > 0) {
        for (const pattern of source.email_patterns) {
          if (pattern === fromEmail || 
              (pattern.includes('*') && fromEmail.includes(pattern.replace('*', '')))) {
            return { id: source.id, name: source.name }
          }
        }
      }
      
      // Check domain patterns
      if (source.domain_patterns && source.domain_patterns.length > 0) {
        const emailDomain = fromEmail.split('@')[1]
        for (const pattern of source.domain_patterns) {
          if (emailDomain === pattern || 
              (pattern.includes('*') && emailDomain.includes(pattern.replace('*', '')))) {
            return { id: source.id, name: source.name }
          }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error detecting lead source from email:', error)
    return null
  }
}

export async function addEmailAsLeadSource(email: string, name?: string): Promise<{ id: string; name: string } | null> {
  try {
    const emailDomain = email.split('@')[1]
    const sourceName = name || `${emailDomain} Email`
    
    // Check if this email or domain already exists
    const existingSource = await detectLeadSourceFromEmail(email)
    if (existingSource) {
      return existingSource
    }
    
    // Create new lead source
    const { data, error } = await supabase
      .from('lead_sources')
      .insert({
        name: sourceName,
        description: `Leads from ${email}`,
        email_patterns: [email],
        domain_patterns: [emailDomain],
        keywords: ['email', 'inquiry'],
        is_default: false,
        is_active: true
      })
      .select('id, name')
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error adding email as lead source:', error)
    return null
  }
}

export async function getLeadSources(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Error fetching lead sources:', error)
    return []
  }
}

// Search leads for @mention functionality
export async function searchLeadsByName(searchTerm: string, userId?: string, userRole?: string): Promise<any[]> {
  try {
    // Strip @ symbol from search term for actual content search
    const cleanSearchTerm = searchTerm.replace(/^@/, '')
    
    // Split search term into words for better matching
    const searchWords = cleanSearchTerm.split(' ').filter(word => word.length > 0)
    
    let query = supabase
      .from('people')
      .select('id, first_name, last_name, email, lead_status, client_type, assigned_to')
      .limit(10)
    
    // Build OR conditions for each search word
    if (searchWords.length > 0) {
      const orConditions = searchWords.map(word => 
        `first_name.ilike.%${word}%,last_name.ilike.%${word}%`
      ).join(',')
      query = query.or(orConditions)
    }
    
    // Filter out staging leads for BOTH agents and admins - only show assigned leads and regular people
    query = query.neq('lead_status', 'staging')
    
    // If user is an agent, only show their assigned leads
    if (userRole === 'agent' && userId) {
      query = query.eq('assigned_to', userId)
    }
    // For admins, show all assigned leads (not staging) and all clients
    // The .neq('lead_status', 'staging') above already handles this
    
    const { data, error } = await query
    if (error) throw error
    
    // Filter results to include email matches and full name matches
    const filteredData = (data || []).filter(person => {
      const fullName = `${person.first_name} ${person.last_name}`.toLowerCase()
      const searchTermLower = cleanSearchTerm.toLowerCase()
      
      // Check if full name contains the search term
      const fullNameMatch = fullName.includes(searchTermLower)
      
      // Check if any search word matches the full name
      const wordMatch = searchWords.some(word => 
        fullName.includes(word.toLowerCase())
      )
      
      // Check email matches
      const emailMatch = person.email && Array.isArray(person.email) && 
        person.email.some(email => email.toLowerCase().includes(searchTermLower))
      
      return fullNameMatch || wordMatch || emailMatch
    })
    
    return filteredData.map(person => ({
      id: person.id,
      name: `${person.first_name} ${person.last_name}`,
      email: Array.isArray(person.email) ? person.email[0] : person.email,
      lead_status: person.lead_status,
      client_type: person.client_type
    }))
  } catch (error) {
    console.error('Error searching leads:', error)
    return []
  }
}

// Agent Reports Functions
export async function getAgentReports(userId: string, startDate: string, endDate: string): Promise<any> {
  try {
    // Convert dates to ISO strings for database queries
    const startDateTime = new Date(startDate + 'T00:00:00.000Z').toISOString()
    const endDateTime = new Date(endDate + 'T23:59:59.999Z').toISOString()

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Get activities for the agent
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        type,
        description,
        created_at,
        people!person_id (
          first_name,
          last_name
        )
      `)
      .eq('created_by', userId)
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: false })

    if (activitiesError) throw activitiesError

    // Get follow-ups for the agent (through people they're assigned to)
    const { data: followUps, error: followUpsError } = await supabase
      .from('follow_ups')
      .select(`
        id,
        type,
        status,
        scheduled_date,
        updated_at,
        people!person_id (
          first_name,
          last_name
        )
      `)
      .eq('people.assigned_to', userId)
      .gte('scheduled_date', startDateTime)
      .lte('scheduled_date', endDateTime)
      .order('scheduled_date', { ascending: false })

    if (followUpsError) throw followUpsError

    // Get missed follow-ups (scheduled but not completed)
    const { data: missedFollowUps, error: missedFollowUpsError } = await supabase
      .from('follow_ups')
      .select(`
        id,
        type,
        scheduled_date,
        people!person_id (
          first_name,
          last_name
        )
      `)
      .eq('people.assigned_to', userId)
      .eq('status', 'pending')
      .lt('scheduled_date', new Date().toISOString())
      .gte('scheduled_date', startDateTime)
      .lte('scheduled_date', endDateTime)
      .order('scheduled_date', { ascending: false })

    if (missedFollowUpsError) throw missedFollowUpsError

    // Get notes created by the agent
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        id,
        title,
        content,
        created_at,
        people!person_id (
          first_name,
          last_name
        )
      `)
      .eq('created_by', userId)
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: false })

    if (notesError) throw notesError

    // Process and format the data
    const processedActivities = (activities || []).map(activity => {
      const people = Array.isArray(activity.people) ? activity.people[0] : activity.people
      return {
        id: activity.id,
        type: activity.type,
        description: activity.description,
        created_at: activity.created_at,
        person_name: people ? `${people.first_name} ${people.last_name}` : undefined
      }
    })

    const processedFollowUps = (followUps || []).map(followUp => {
      const people = Array.isArray(followUp.people) ? followUp.people[0] : followUp.people
      return {
        id: followUp.id,
        type: followUp.type,
        status: followUp.status,
        scheduled_date: followUp.scheduled_date,
        completed_date: followUp.status === 'completed' ? followUp.updated_at : undefined,
        person_name: people ? `${people.first_name} ${people.last_name}` : undefined
      }
    })

    const processedMissedFollowUps = (missedFollowUps || []).map(followUp => {
      const people = Array.isArray(followUp.people) ? followUp.people[0] : followUp.people
      return {
        id: followUp.id,
        type: followUp.type,
        scheduled_date: followUp.scheduled_date,
        person_name: people ? `${people.first_name} ${people.last_name}` : undefined
      }
    })

    const processedNotes = (notes || []).map(note => {
      const people = Array.isArray(note.people) ? note.people[0] : note.people
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        person_name: people ? `${people.first_name} ${people.last_name}` : undefined
      }
    })

    // Calculate statistics
    const stats = {
      totalActivities: processedActivities.length,
      totalFollowUps: processedFollowUps.length,
      completedFollowUps: processedFollowUps.filter(f => f.status === 'completed').length,
      missedFollowUps: processedMissedFollowUps.length,
      totalNotes: processedNotes.length
    }

    return {
      userId: user.id,
      userEmail: user.email,
      userName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
      activities: processedActivities,
      followUps: processedFollowUps,
      missedFollowUps: processedMissedFollowUps,
      notes: processedNotes,
      stats
    }

  } catch (error) {
    console.error('Error generating agent report:', error)
    throw error
  }
} 