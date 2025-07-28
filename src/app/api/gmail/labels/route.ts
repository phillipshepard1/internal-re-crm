import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

// Simple in-memory cache for labels (in production, use Redis or similar)
const labelsCache = new Map<string, { labels: any[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    console.log('Gmail Labels API called with userId:', userId)

    if (!userId) {
      console.log('No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check cache first
    const cached = labelsCache.get(userId)
    const now = Date.now()
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached labels for userId:', userId)
      return NextResponse.json({
        success: true,
        labels: cached.labels,
        message: `Successfully fetched ${cached.labels.length} Gmail labels (cached)`,
        cached: true
      })
    }

    // Check if environment variables are set
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.log('Missing Gmail environment variables')
      return NextResponse.json({
        error: 'Gmail configuration missing. Please check environment variables.'
      }, { status: 500 })
    }

    // Get user's Gmail tokens from database
    console.log('Fetching user tokens for userId:', userId)
    const userTokens = await GmailIntegration.getUserGmailTokens(userId)
    
    if (!userTokens) {
      console.log('No Gmail tokens found for userId:', userId)
      return NextResponse.json({
        error: 'No Gmail connection found. Please connect your Gmail account first.'
      }, { status: 404 })
    }

    console.log('Found user tokens for email:', userTokens.email_address)

    // Get Gmail configuration with user's tokens
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: userTokens.refresh_token,
      accessToken: userTokens.access_token,
      emailAddress: userTokens.email_address
    }

    console.log('Initializing Gmail integration...')
    // Initialize Gmail integration
    const gmail = new GmailIntegration(gmailConfig, userId)
    const initialized = await gmail.initialize()

    if (!initialized) {
      console.log('Failed to initialize Gmail integration')
      return NextResponse.json({
        error: 'Failed to initialize Gmail integration. Please reconnect your Gmail account.'
      }, { status: 500 })
    }

    console.log('Gmail initialized successfully, fetching labels...')
    // Get Gmail labels
    const labels = await gmail.getLabels()

    console.log('Labels fetched successfully:', labels.length, 'labels')

    // Cache the results
    labelsCache.set(userId, { labels, timestamp: now })

    return NextResponse.json({
      success: true,
      labels: labels,
      message: `Successfully fetched ${labels.length} Gmail labels`
    })

  } catch (error) {
    console.error('Gmail labels error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 