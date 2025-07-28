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
    
    // Download attachment
    try {
      const attachmentData = await gmail.downloadAttachment(messageId, attachmentId)
      
      if (!attachmentData) {
        return NextResponse.json({
          success: false,
          error: 'Attachment not found or could not be downloaded'
        }, { status: 404 })
      }

      // Get attachment metadata from the email
      const email = await gmail.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      // Find the attachment part
      const findAttachmentPart = (parts: any[]): any => {
        for (const part of parts) {
          if (part.body?.attachmentId === attachmentId) {
            return part
          }
          if (part.parts) {
            const found = findAttachmentPart(part.parts)
            if (found) return found
          }
        }
        return null
      }

      const attachmentPart = findAttachmentPart(email.data.payload?.parts || [])
      
      if (!attachmentPart) {
        return NextResponse.json({
          success: false,
          error: 'Attachment metadata not found'
        }, { status: 404 })
      }

      // Convert Buffer to base64 string
      const base64Data = attachmentData.toString('base64')
      
      return NextResponse.json({ 
        success: true,
        attachment: {
          data: base64Data,
          mimeType: attachmentPart.mimeType,
          filename: attachmentPart.filename,
          size: attachmentPart.body?.size || 0
        },
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