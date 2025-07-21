import { supabase } from './supabase'
import type { Person, Note, Task, FollowUp, FollowUpWithPerson, Activity, File } from './supabase'

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
    
    console.log(`Database connection test: ${responseTime}ms`)
    return { connected: true }
  } catch (error) {
    console.error('Database connection test failed:', error)
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
      console.error('Error creating user:', upsertError)
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
    console.error('Error assigning user role:', error)
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
    console.error('Error updating user role:', error)
    throw error
  }
}

// People/Contacts
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
    .or('client_type.neq.lead,lead_status.eq.converted') // Include non-leads and converted leads
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
  
  // Transform the data to match FollowUpWithPerson type
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    people: Array.isArray(item.people) ? item.people[0] : item.people
  }))
  
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
      console.error('Failed to create task from follow-up:', taskError)
      // Don't fail the follow-up update if task creation fails
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
    // Get all data
    const [people, followUps, tasks, activities, users] = await Promise.all([
      getPeople(),
      getFollowUps(),
      getTasks(),
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
    console.error('Error getting admin dashboard stats:', error)
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
      )
    `)
    .eq('client_type', 'lead')
    .in('lead_status', ['assigned', 'contacted', 'qualified', 'lost'])
    .order('created_at', { ascending: false })
  
  // If user is an agent, only show their assigned leads
  if (userRole === 'agent' && userId) {
    query = query.eq('assigned_to', userId)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function assignLeadToUser(leadId: string, userId: string) {
  const { data, error } = await supabase
    .from('people')
    .update({
      assigned_to: userId,
      lead_status: 'assigned',
      updated_at: new Date().toISOString()
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
  console.log('Getting users for assignment...')
  
  // First, let's see ALL users in the database
  const { data: allUsers, error: allUsersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .order('first_name', { ascending: true })
  
  if (allUsersError) {
    console.error('Error getting all users:', allUsersError)
  } else {
    console.log('All users in database:', allUsers)
  }
  
  // Now get users for assignment (agents and admins)
  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .in('role', ['agent', 'admin'])
    .order('first_name', { ascending: true })
  
  if (error) {
    console.error('Error getting users for assignment:', error)
    throw error
  }
  
  console.log('Users for assignment found:', data)
  console.log('Number of users found:', data?.length || 0)
  
  return data || []
}

export async function getLeadStats(userId?: string, userRole?: string) {
  let query = supabase
    .from('people')
    .select('lead_status, client_type')
    .or('client_type.eq.lead,lead_status.eq.converted')
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
  
  // Calculate total active leads (assigned + contacted + qualified + lost)
  stats.assigned = stats.assigned + stats.contacted + stats.qualified + stats.lost
  
  return stats
} 