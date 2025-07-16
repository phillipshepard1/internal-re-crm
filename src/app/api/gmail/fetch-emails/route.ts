import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { maxResults = 20, userId, labelId, pageToken } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

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
      refreshToken: '', // Will be loaded from user's tokens
      emailAddress: '', // Will be loaded from user's tokens
    }
    
    // Validate configuration
    if (!gmailConfig.clientId || !gmailConfig.clientSecret) {
      return NextResponse.json({ 
        error: 'Gmail OAuth client credentials not configured',
        required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET']
      }, { status: 400 })
    }

    // Initialize Gmail integration with user-specific tokens
    const gmail = new GmailIntegration(gmailConfig, userId)
    const initialized = await gmail.initialize()

    if (!initialized) {
      return NextResponse.json({
        error: 'Failed to initialize Gmail integration. Please connect your Gmail account first.' 
      }, { status: 500 })
    }
    
    // Fetch emails using the GmailIntegration class
    try {
      let emails
      let nextPageToken
      
      if (labelId) {
        // Get emails for specific label
        const result = await gmail.getEmailsByLabel(labelId, maxResults, pageToken)
        emails = result.emails
        nextPageToken = result.nextPageToken
      } else {
        // Get recent emails from Gmail
        emails = await gmail.getRecentEmails(maxResults)
      }
      
      return NextResponse.json({ 
        success: true,
        emails: emails,
        count: emails.length,
        nextPageToken: nextPageToken,
        message: `Successfully fetched ${emails.length} emails from Gmail${labelId ? ` for label ${labelId}` : ''}`
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