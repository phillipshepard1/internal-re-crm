import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { to, cc, bcc, subject, body, userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, and body are required' },
        { status: 400 }
      )
    }

    // Get user's Gmail tokens
    const userTokens = await GmailIntegration.getUserGmailTokens(userId)
    if (!userTokens) {
      return NextResponse.json(
        { success: false, error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 400 }
      )
    }

    // Initialize Gmail integration
    const gmailConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: userTokens.refresh_token,
      accessToken: userTokens.access_token || undefined,
      emailAddress: userTokens.gmail_email || ''
    }

    const gmailIntegration = new GmailIntegration(gmailConfig, userId)
    const initialized = await gmailIntegration.initialize()

    if (!initialized) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize Gmail integration' },
        { status: 500 }
      )
    }

    // Send the email
    await gmailIntegration.sendEmail({
      to,
      cc,
      bcc,
      subject,
      body
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      },
      { status: 500 }
    )
  }
} 