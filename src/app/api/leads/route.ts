import { NextRequest, NextResponse } from 'next/server'
import { assignLeadToRoundRobin } from '@/lib/roundRobin'
import type { LeadData } from '@/lib/roundRobin'
import { createClient } from '@supabase/supabase-js'
import { unformatPhoneNumber } from '@/lib/utils'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is a direct lead creation from an agent (has assignedTo)
    if (body.assignedTo) {
      // This is a direct lead creation from an agent - no API key needed
      // For now, we'll trust the request since it's coming from authenticated frontend
      // In production, you'd want to validate the session properly
      
      // Create the lead directly assigned to the agent
      const { firstName, lastName, email, phone, source, notes, assignedTo } = body
      
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
        phone: phone ? [unformatPhoneNumber(phone.trim())] : [],
        client_type: 'lead',
        lead_status: 'assigned', // Set to assigned directly
        lead_source: source || 'agent_manual',
        notes: notes || null,
        assigned_to: assignedTo,
        assigned_by: assignedTo, // Agent assigns to themselves
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lists: [],
        profile_picture: null,
        birthday: null,
        mailing_address: null,
        relationship_id: null,
        last_interaction: null,
        next_follow_up: null,
        best_to_reach_by: null
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
          description: `Lead created manually by agent`,
          created_by: assignedTo
        }])
      
      if (activityError) {
        console.error('Error creating activity:', activityError)
        // Don't fail the request if activity creation fails
      }
      
      return NextResponse.json({
        success: true,
        lead: newLead,
        message: `Lead ${firstName} ${lastName} has been created and assigned to you`
      })
    }
    
    // Otherwise, this is an API request - require API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.LEAD_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Handle single lead or batch of leads
    const leads: LeadData[] = Array.isArray(body) ? body : [body]
    
    // Validate all leads
    for (const lead of leads) {
      if (!lead.first_name || !lead.last_name) {
        return NextResponse.json(
          { error: 'Invalid lead data: first_name and last_name are required' },
          { status: 400 }
        )
      }
    }
    
    // Assign leads via Round Robin
    const results = await Promise.all(
      leads.map(async (lead) => {
        const success = await assignLeadToRoundRobin(lead)
        return { success, lead }
      })
    )
    
    const successfulAssignments = results.filter(result => result.success)
    const failedAssignments = results.filter(result => !result.success)
    
    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${successfulAssignments.length} out of ${leads.length} leads`,
      assignedLeads: successfulAssignments.map(result => ({
        name: `${result.lead.first_name} ${result.lead.last_name}`,
        email: result.lead.email?.[0] || '',
        phone: result.lead.phone?.[0] || '',
        source: result.lead.lead_source
      })),
      failedCount: failedAssignments.length
    })
    
  } catch (error) {
    console.error('Error processing leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Lead ingestion API',
    endpoints: {
      POST: '/api/leads - Ingest new leads'
    },
    required_headers: {
      'x-api-key': 'Your API key'
    }
  })
} 