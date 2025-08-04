import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // First check if the lead exists and get its details
    const { data: lead, error: fetchError } = await supabase
      .from('people')
      .select('id, first_name, last_name, lead_status')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Check if lead is in staging status (only allow deletion of staging leads)
    if (lead.lead_status !== 'staging') {
      return NextResponse.json(
        { error: 'Only staging leads can be deleted. Please archive this lead instead.' },
        { status: 400 }
      )
    }

    // Delete related data first to avoid foreign key constraints
    // Delete activities
    const { error: activitiesError } = await supabase
      .from('activities')
      .delete()
      .eq('person_id', leadId)

    if (activitiesError) {
      console.error('Error deleting activities:', activitiesError)
    }

    // Delete notes
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('person_id', leadId)

    if (notesError) {
      console.error('Error deleting notes:', notesError)
    }

    // Delete tasks
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('person_id', leadId)

    if (tasksError) {
      console.error('Error deleting tasks:', tasksError)
    }

    // Delete follow-ups
    const { error: followUpsError } = await supabase
      .from('follow_ups')
      .delete()
      .eq('person_id', leadId)

    if (followUpsError) {
      console.error('Error deleting follow-ups:', followUpsError)
    }

    // Delete files
    const { error: filesError } = await supabase
      .from('files')
      .delete()
      .eq('person_id', leadId)

    if (filesError) {
      console.error('Error deleting files:', filesError)
    }

    // Finally, delete the lead
    const { error: deleteError } = await supabase
      .from('people')
      .delete()
      .eq('id', leadId)

    if (deleteError) {
      console.error('Error deleting lead:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Lead ${lead.first_name} ${lead.last_name} has been deleted successfully`
    })

  } catch (error) {
    console.error('Error in delete lead API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}