import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Import the shared processing function
    const { processEmailAsLead } = await import('@/lib/emailProcessing')
    
    // Test with sample email data
    const testEmailData = {
      emailData: {
        from: body.from || 'test@example.com',
        subject: body.subject || 'Test Lead Inquiry',
        body: body.body || 'Hi, I am interested in buying a property. My name is John Doe and my email is john@example.com. My phone is (555) 123-4567. I am looking for a 3-bedroom house in the $500k-$750k range.',
        to: body.to || 'agent@yourcompany.com',
        date: body.date || new Date().toISOString()
      },
      userId: body.userId || 'test-user-id'
    }
    
    // Process the test email
    const result = await processEmailAsLead(testEmailData)
    
    return NextResponse.json({
      success: true,
      test_result: result,
      message: 'Email processing test completed'
    })

  } catch (error) {
    console.error('Test email processing error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Processing Test Endpoint',
    description: 'Test the email-to-lead parsing system',
    usage: 'POST with email data to test processing',
    example: {
      from: 'test@example.com',
      subject: 'Property Inquiry',
      body: 'Hi, I am interested in buying a property...',
      to: 'agent@yourcompany.com',
      userId: 'test-user-id'
    }
  })
} 