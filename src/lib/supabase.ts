import { createClient } from '@supabase/supabase-js'
import { validateEnvVars } from './utils'

// Validate required environment variables at module load time
const envVars = validateEnvVars({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

export const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Database types
export interface User {
  id: string
  email: string
  role: 'admin' | 'agent'
  first_name?: string | null
  last_name?: string | null
  status: 'active' | 'archived'
  archived_at?: string | null
  archived_by?: string | null
  created_at: string
  updated_at: string
}

export interface LeadTag {
  id: string
  name: string
  color: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FollowUpPlanTemplate {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface FollowUpPlanStep {
  id: string
  plan_id: string
  step_order: number
  type: 'call' | 'email' | 'meeting' | 'task' | 'other'
  title: string
  description?: string | null
  days_after_assignment: number
  notes?: string | null
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
  pixel_source_url?: string
  pixel_referrer?: string
  pixel_api_key?: string
  // Lead management
  lead_status?: 'staging' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost'
  // New fields for lead tagging and follow-up plans
  lead_tag_id?: string | null
  follow_up_plan_id?: string | null
  assigned_by?: string | null
  assigned_at?: string | null
  // Simplified follow-up system fields
  follow_up_frequency?: 'twice_week' | 'weekly' | 'biweekly' | 'monthly' | null
  follow_up_day_of_week?: number | null
  last_follow_up_date?: string | null
  has_initial_followup?: boolean
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
  // Joined tag data
  lead_tag?: LeadTag
  // Joined plan data
  follow_up_plan?: FollowUpPlanTemplate
  // Joined assigned by user data
  assigned_by_user?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  // Archive fields
  archived_at?: string | null
  archived_by?: string | null
  // Joined archived by user data
  archived_by_user?: {
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
  people?: {
    id: string
    first_name: string
    last_name: string
    email: string[]
  }
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
  type: 'created' | 'follow_up' | 'note_added' | 'task_added' | 'assigned' | 'status_changed'
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