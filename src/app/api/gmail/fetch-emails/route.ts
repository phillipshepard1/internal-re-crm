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

    // Get user's Gmail tokens from database
    const userTokens = await GmailIntegration.getUserGmailTokens(userId)
    
    if (!userTokens) {
      return NextResponse.json({
        error: 'No Gmail connection found. Please connect your Gmail account first.'
      }, { status: 404 })
    }

    // Get Gmail configuration with user's tokens
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: userTokens.refresh_token,
      accessToken: userTokens.access_token,
      emailAddress: userTokens.email_address
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
        error: 'Failed to initialize Gmail integration. Please reconnect your Gmail account.' 
      }, { status: 500 })
    }
    
    // Fetch emails using the GmailIntegration class
    try {
      let emails
      let nextPageToken
      
      console.log('Fetching emails with params:', { labelId, maxResults, pageToken })
      
      if (labelId) {
        // Get emails for specific label
        console.log('Fetching emails for label:', labelId)
        const result = await gmail.getEmailsByLabel(labelId, maxResults, pageToken)
        emails = result.emails
        nextPageToken = result.nextPageToken
        console.log('Emails fetched for label:', { count: emails.length, nextPageToken })
      } else {
        // Get recent emails from Gmail
        console.log('Fetching recent emails')
        emails = await gmail.getRecentEmails(maxResults)
        console.log('Recent emails fetched:', { count: emails.length })
      }
      
      console.log('Final email count:', emails.length)
      
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