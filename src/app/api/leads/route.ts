import { NextRequest, NextResponse } from 'next/server'
import { assignLeadToRoundRobin } from '@/lib/roundRobin'
import type { LeadData } from '@/lib/roundRobin'

export async function POST(request: NextRequest) {
  try {
    // Verify API key (you can customize this)
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.LEAD_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
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