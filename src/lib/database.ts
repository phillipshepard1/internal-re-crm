import { supabase } from './supabase'
import type { Person, Note, Task, FollowUp, Activity } from './supabase'

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

export async function createUser(userData: any) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateUser(id: string, updates: any) {
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

export async function createProperty(propertyData: any) {
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