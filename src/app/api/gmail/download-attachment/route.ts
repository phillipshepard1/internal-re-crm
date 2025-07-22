import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, messageId, attachmentId } = body

    if (!userId || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: 'User ID, message ID, and attachment ID are required' },
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
    
    // Download attachment
    try {
      const attachmentData = await gmail.downloadAttachment(messageId, attachmentId)
      
      return NextResponse.json({ 
        success: true,
        attachment: attachmentData,
        message: 'Attachment downloaded successfully'
      })
    } catch (error) {
      console.error('Error downloading attachment:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to download attachment from Gmail',
        message: 'Gmail integration is ready but attachment download failed. Check your API permissions.'
      }, { status: 500 })
    }

  } catch (err: unknown) {
    console.error('Gmail attachment download error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 