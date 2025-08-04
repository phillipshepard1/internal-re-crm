import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Person } from '@/lib/supabase'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone, source, notes, createdBy } = await request.json()

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Prepare lead data for direct insertion
    const personData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email ? [email.trim()] : [],
      phone: phone ? [phone.trim()] : [],
      client_type: 'lead',
      lead_status: 'staging',
      lead_source: source || 'manual',
      notes: notes || null,
      assigned_to: createdBy, // Temporarily assign to creator to satisfy DB constraint
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lists: [],
      profile_picture: null,
      birthday: null,
      mailing_address: null,
      relationship_id: null,
      last_interaction: null,
      next_follow_up: null,
      best_to_reach_by: null,
    }

    // Create the lead directly using Supabase
    const { data: newLead, error } = await supabase
      .from('people')
      .insert([personData])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      throw error
    }

    // Create activity log
    const { error: activityError } = await supabase
      .from('activities')
      .insert([{
        person_id: newLead.id,
        type: 'created',
        description: `Lead created manually from admin panel`,
        created_by: createdBy || 'system'
      }])

    if (activityError) {
      console.error('Error creating activity:', activityError)
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json({
      success: true,
      lead: newLead,
      message: `Lead ${firstName} ${lastName} has been created successfully`
    })

  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create lead' },
      { status: 500 }
    )
  }
}