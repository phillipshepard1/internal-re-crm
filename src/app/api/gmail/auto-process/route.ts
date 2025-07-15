import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized request (you can add API key verification here)
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.LEAD_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { maxResults = 10 } = body

    // Get Gmail configuration
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      emailAddress: process.env.GMAIL_EMAIL_ADDRESS!,
    }
    
    // Validate configuration
    if (!gmailConfig.clientId || !gmailConfig.clientSecret || !gmailConfig.refreshToken) {
      return NextResponse.json({ 
        error: 'Gmail configuration missing'
      }, { status: 400 })
    }

    // Initialize and process emails
    const gmail = new GmailIntegration(gmailConfig)
    const initialized = await gmail.initialize()

    if (!initialized) {
      return NextResponse.json({
        error: 'Failed to initialize Gmail integration' 
      }, { status: 500 })
    }
    
    // Process recent emails for leads
    const processedCount = await gmail.processRecentEmails(maxResults)

    return NextResponse.json({ 
      success: true,
      processedCount,
      message: `Automatically processed ${processedCount} emails for leads`
    })

  } catch (error) {
    console.error('Auto-process error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail Auto-Process API',
    description: 'Automatically process Gmail emails and extract leads',
    usage: 'POST with x-api-key header',
    parameters: {
      maxResults: 'Number of emails to process (default: 10)'
    }
  })
} 