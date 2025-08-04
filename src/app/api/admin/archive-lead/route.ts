import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createActivity } from '@/lib/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { leadId, archivedBy } = await request.json()

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // First check if the lead exists and get its details
    const { data: lead, error: fetchError } = await supabase
      .from('people')
      .select('id, first_name, last_name, lead_status, archived_at')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Check if already archived
    if (lead.archived_at) {
      return NextResponse.json(
        { error: 'Lead is already archived' },
        { status: 400 }
      )
    }

    // Archive the lead
    const { error: archiveError } = await supabase
      .from('people')
      .update({
        archived_at: new Date().toISOString(),
        archived_by: archivedBy || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (archiveError) {
      console.error('Error archiving lead:', archiveError)
      return NextResponse.json(
        { error: 'Failed to archive lead' },
        { status: 500 }
      )
    }

    // Create activity log
    try {
      await createActivity({
        person_id: leadId,
        type: 'status_changed',
        description: `Lead archived`,
        created_by: archivedBy || 'system'
      })
    } catch (activityError) {
      console.error('Error creating activity:', activityError)
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json({
      success: true,
      message: `Lead ${lead.first_name} ${lead.last_name} has been archived successfully`
    })

  } catch (error) {
    console.error('Error in archive lead API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}