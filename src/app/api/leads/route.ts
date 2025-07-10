import { NextRequest, NextResponse } from 'next/server'
import { RoundRobinService } from '@/lib/roundRobin'
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
      try {
        RoundRobinService.validateLeadData(lead)
      } catch (error) {
        return NextResponse.json(
          { error: `Invalid lead data: ${error}` },
          { status: 400 }
        )
      }
    }
    
    // Assign leads via Round Robin
    const assignedLeads = await RoundRobinService.assignLeadsBatch(leads)
    
    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${assignedLeads.length} leads`,
      assignedLeads: assignedLeads.map(lead => ({
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`,
        assigned_to: lead.assigned_to
      }))
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