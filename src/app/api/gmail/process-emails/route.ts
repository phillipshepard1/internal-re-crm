import { NextRequest, NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { maxResults = 20, userId } = body

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
    
    // Process recent emails
    const processedCount = await gmail.processRecentEmails(maxResults, supabase)

    return NextResponse.json({ 
      success: true,
      processedCount,
      message: `Processed ${processedCount} leads from Gmail`
    })

  } catch (err: unknown) {
    console.error('Gmail processing error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 