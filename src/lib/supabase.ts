import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  role: 'admin' | 'agent'
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  first_name: string
  last_name: string
  profile_picture: string | null
  email: string[]
  phone: string[]
  client_type: string
  birthday: string | null
  mailing_address: string | null
  relationship_id: string | null
  assigned_to: string
  created_at: string
  updated_at: string
  last_interaction: string | null
  next_follow_up: string | null
  best_to_reach_by: string | null
  notes: string | null
  lists: string[]
  // Additional fields for enhanced functionality
  company?: string
  position?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  lead_source?: string
  lead_source_id?: string
  // Properties fields
  looking_for?: string
  selling?: string
  closed?: string
  // Joined user data
  assigned_user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
}

export interface Note {
  id: string
  title: string
  content: string
  person_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  person_id: string | null
  assigned_to: string
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface FollowUp {
  id: string
  person_id: string | null
  scheduled_date: string
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'other'
}

export interface FollowUpWithPerson extends FollowUp {
  people?: Person
}

export interface Activity {
  id: string
  person_id: string
  type: 'created' | 'follow_up' | 'note_added' | 'task_added'
  description: string
  created_by: string
  created_at: string
}

export interface RoundRobinConfig {
  id: string
  user_id: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
} 

export interface File {
  id: string
  person_id: string | null
  filename: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  created_at: string
} 