import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      leadId, 
      newUserId, 
      reassignedBy, 
      followUpFrequency, 
      followUpDayOfWeek,
      copyFollowUps = true, 
      copyNotes = true,
      reassignmentNotes 
    } = body

    if (!leadId || !newUserId) {
      return NextResponse.json(
        { error: 'Lead ID and New User ID are required' },
        { status: 400 }
      )
    }

    // Start a transaction
    const { data: lead, error: leadError } = await supabase
      .from('people')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Get user information for activity tracking
    const { data: previousUser, error: previousUserError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', lead.assigned_to)
      .single()

    const { data: newUser, error: newUserError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', newUserId)
      .single()

    // Get user display names
    const getDisplayName = (user: any) => {
      if (user?.first_name && user?.last_name) {
        return `${user.first_name} ${user.last_name}`
      }
      return user?.email?.split('@')[0] || 'Unknown User'
    }

    const previousUserName = getDisplayName(previousUser)
    const newUserName = getDisplayName(newUser)

    // Update the lead assignment
    const { data: updatedLead, error: assignmentError } = await supabase
      .from('people')
      .update({
        assigned_to: newUserId,
        assigned_by: reassignedBy || newUserId,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        follow_up_frequency: followUpFrequency,
        follow_up_day_of_week: followUpDayOfWeek
      })
      .eq('id', leadId)
      .select()
      .single()

    if (assignmentError) {
      console.error('Error reassigning lead:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to reassign lead' },
        { status: 500 }
      )
    }

    // Copy follow-ups if requested
    let copiedFollowUps = []
    if (copyFollowUps) {
      const { data: existingFollowUps, error: followUpsError } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('person_id', leadId)
        .eq('status', 'pending')

      if (!followUpsError && existingFollowUps) {
        // Create new follow-ups for the new user
        const newFollowUps = existingFollowUps.map(followUp => ({
          person_id: leadId,
          assigned_to: newUserId,
          type: followUp.type,
          title: followUp.title,
          description: followUp.description,
          scheduled_date: followUp.scheduled_date,
          status: 'pending',
          created_by: reassignedBy || newUserId,
          notes: followUp.notes
        }))

        const { data: insertedFollowUps, error: insertFollowUpsError } = await supabase
          .from('follow_ups')
          .insert(newFollowUps)
          .select()

        if (!insertFollowUpsError) {
          copiedFollowUps = insertedFollowUps || []
        }
      }
    }

    // Copy notes if requested
    let copiedNotes = []
    if (copyNotes) {
      const { data: existingNotes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('person_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10) // Copy last 10 notes

      if (!notesError && existingNotes) {
        // Create new notes for the new user
        const newNotes = existingNotes.map(note => ({
          person_id: leadId,
          title: `Copied: ${note.title}`,
          content: note.content,
          created_by: reassignedBy || newUserId,
          notes: `Note copied from previous assignment. Original note by: ${note.created_by}`
        }))

        const { data: insertedNotes, error: insertNotesError } = await supabase
          .from('notes')
          .insert(newNotes)
          .select()

        if (!insertNotesError) {
          copiedNotes = insertedNotes || []
        }
      }
    }

    // Create activity record for reassignment
    const activityDescription = `Lead reassigned from ${previousUserName} to ${newUserName}${reassignmentNotes ? ` - ${reassignmentNotes}` : ''}`
    
    await supabase
      .from('activities')
      .insert([{
        person_id: leadId,
        type: 'assigned',
        description: activityDescription,
        created_by: reassignedBy || newUserId
      }])

    // Apply follow-up frequency settings
    if (followUpFrequency) {
      try {
        const { applyFollowUpFrequencyToLead } = await import('@/lib/database')
        await applyFollowUpFrequencyToLead(leadId, followUpFrequency, followUpDayOfWeek || 1, newUserId)
      } catch (frequencyError) {
        console.error('Error applying follow-up frequency:', frequencyError)
        // Don't fail the reassignment if frequency application fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead reassigned successfully',
      lead: updatedLead,
      copiedFollowUps: copiedFollowUps.length,
      copiedNotes: copiedNotes.length
    })

  } catch (error) {
    console.error('Error in lead reassignment API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 