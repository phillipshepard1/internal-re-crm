import { NextRequest, NextResponse } from 'next/server'
import { EmailLeadProcessor } from '@/lib/emailProcessor'
import { assignLeadToRoundRobin } from '@/lib/roundRobin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailData } = body

    if (!emailData) {
      return NextResponse.json(
        { error: 'Email data is required' },
        { status: 400 }
      )
    }

    // Process the email to extract lead information
    const lead = await EmailLeadProcessor.processEmail(emailData)
    
    if (!lead) {
      return NextResponse.json(
        { error: 'No lead information found in email' },
        { status: 400 }
      )
    }

    // Assign the lead via Round Robin
    const success = await assignLeadToRoundRobin({
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      client_type: 'lead',
      lead_source: lead.source,
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead successfully imported from email',
      lead: {
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email[0] || '',
        phone: lead.phone[0] || '',
        source: lead.source,
        message: lead.message
      }
    })

  } catch (error) {
    console.error('Error processing email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email processing API',
    endpoints: {
      POST: '/api/email/process - Process email and import lead'
    },
    required_body: {
      emailData: {
        subject: 'string',
        from: 'string',
        body: 'string',
        to: 'string'
      }
    }
  })
} 