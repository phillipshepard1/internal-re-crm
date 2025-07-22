import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { applyFollowUpPlanToLead } from '@/lib/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, userId, assignedBy, followUpPlanId } = body

    if (!leadId || !userId) {
      return NextResponse.json(
        { error: 'Lead ID and User ID are required' },
        { status: 400 }
      )
    }

    // Update the lead assignment
    const { data: lead, error: assignmentError } = await supabase
      .from('people')
      .update({
        assigned_to: userId,
        lead_status: 'assigned',
        assigned_by: assignedBy || userId, // Use the admin's ID who is doing the assignment
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

    // Apply follow-up plan if provided
    if (followUpPlanId && followUpPlanId !== 'none') {
      try {
        await applyFollowUpPlanToLead(leadId, followUpPlanId, userId)
      } catch (planError) {
        console.error('Error applying follow-up plan:', planError)
        // Don't fail the assignment if plan application fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead assigned successfully',
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