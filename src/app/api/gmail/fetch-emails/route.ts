import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { maxResults = 20 } = body

    if (typeof maxResults !== 'number' || maxResults < 1 || maxResults > 100) {
      return NextResponse.json(
        { error: 'maxResults must be a number between 1 and 100' },
        { status: 400 }
      )
    }

    // Get Gmail configuration from environment variables
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      emailAddress: process.env.GMAIL_EMAIL_ADDRESS!,
    }
    
    // Validate configuration
    if (!gmailConfig.clientId || !gmailConfig.clientSecret || !gmailConfig.refreshToken) {
      return NextResponse.json({ 
        error: 'Gmail configuration missing',
        required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
      }, { status: 400 })
    }

    // Initialize Gmail integration
    const gmail = new GmailIntegration(gmailConfig)
    const initialized = await gmail.initialize()

    if (!initialized) {
      return NextResponse.json({
        error: 'Failed to initialize Gmail integration' 
      }, { status: 500 })
    }
    
    // Fetch emails using the GmailIntegration class
    try {
      // Get recent emails from Gmail
      const emails = await gmail.getRecentEmails(maxResults)
      
      return NextResponse.json({ 
        success: true,
        emails: emails,
        count: emails.length,
        message: `Successfully fetched ${emails.length} emails from Gmail`
      })
    } catch (error) {
      console.error('Error fetching emails:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch emails from Gmail',
        message: 'Gmail integration is ready but email fetching failed. Check your API permissions.'
      }, { status: 500 })
    }

  } catch (err: unknown) {
    console.error('Gmail fetch error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 