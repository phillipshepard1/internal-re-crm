import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get Gmail configuration
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: '',
      emailAddress: '',
    }

    // Initialize Gmail integration
    const gmail = new GmailIntegration(gmailConfig, userId)
    const initialized = await gmail.initialize()

    if (!initialized) {
      return NextResponse.json({
        error: 'Failed to initialize Gmail integration. Please connect your Gmail account first.'
      }, { status: 500 })
    }

    // Get Gmail labels
    const labels = await gmail.getLabels()

    console.log('Labels API Response:', labels)

    return NextResponse.json({
      success: true,
      labels: labels,
      message: `Successfully fetched ${labels.length} Gmail labels`
    })

  } catch (error) {
    console.error('Gmail labels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 