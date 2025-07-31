import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { applyFollowUpFrequencyToLead } from '@/lib/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, userId, assignedBy, followUpFrequency, followUpDayOfWeek } = body

    if (!leadId || !userId) {
      return NextResponse.json(
        { error: 'Lead ID and User ID are required' },
        { status: 400 }
      )
    }

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

    // Update the lead assignment with auto-tagging
    const { data: lead, error: assignmentError } = await supabase
      .from('people')
      .update({
        assigned_to: userId,
        lead_status: 'assigned',
        assigned_by: assignedBy || userId, // Use the admin's ID who is doing the assignment
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lead_tag_id: warmTag?.id || null // Auto-tag as "Warm"
      })
      .eq('id', leadId)
      .select()
      .single()

    if (assignmentError) {
      console.error('Error assigning lead:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to assign lead' },
        { status: 500 }
      )
    }

    // Always create initial follow-up and apply frequency settings
    // Use provided frequency or default to 'weekly' if none specified
    const frequency = followUpFrequency || 'weekly'
    const dayOfWeek = followUpDayOfWeek || 1
    
    try {
      await applyFollowUpFrequencyToLead(leadId, frequency, dayOfWeek, userId)
    } catch (frequencyError) {
      console.error('Error applying follow-up frequency:', frequencyError)
      // Don't fail the assignment if frequency application fails
    }

    return NextResponse.json({
      success: true,
      message: 'Lead assigned successfully with initial follow-up scheduled for next day',
      lead
    })

  } catch (error) {
    console.error('Error in lead assignment API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 