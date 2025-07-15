import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check if Gmail environment variables are configured
    const hasClientId = !!process.env.GMAIL_CLIENT_ID
    const hasClientSecret = !!process.env.GMAIL_CLIENT_SECRET
    const hasRefreshToken = !!process.env.GMAIL_REFRESH_TOKEN
    const hasEmailAddress = !!process.env.GMAIL_EMAIL_ADDRESS
    
    const connected = hasClientId && hasClientSecret && hasRefreshToken && hasEmailAddress
    
    return NextResponse.json({
      connected,
      configured: {
        clientId: hasClientId,
        clientSecret: hasClientSecret,
        refreshToken: hasRefreshToken,
        emailAddress: hasEmailAddress
      },
      message: connected 
        ? 'Gmail integration is configured and ready' 
        : 'Gmail integration requires API keys configuration'
    })
    
  } catch (error) {
    console.error('Error checking Gmail status:', error)
    return NextResponse.json(
      { 
        connected: false,
        error: 'Failed to check Gmail status'
      },
      { status: 500 }
    )
  }
} 