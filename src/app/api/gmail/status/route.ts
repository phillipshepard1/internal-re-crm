import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameters or headers
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if Gmail client credentials are configured
    const hasClientId = !!process.env.GMAIL_CLIENT_ID
    const hasClientSecret = !!process.env.GMAIL_CLIENT_SECRET
    
    if (!hasClientId || !hasClientSecret) {
      return NextResponse.json({
        connected: false,
        configured: {
          clientId: hasClientId,
          clientSecret: hasClientSecret
        },
        message: 'Gmail OAuth client credentials not configured'
      })
    }

    // Check if user has Gmail tokens
    const { data: userTokens, error } = await supabase
      .from('user_gmail_tokens')
      .select('gmail_email, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    const connected = !!userTokens && !error

    return NextResponse.json({
      connected,
      configured: {
        clientId: hasClientId,
        clientSecret: hasClientSecret
      },
      userConnected: connected,
      gmailEmail: userTokens?.gmail_email || null,
      connectedAt: userTokens?.created_at || null,
      lastUpdated: userTokens?.updated_at || null,
      message: connected 
        ? `Gmail connected: ${userTokens.gmail_email}` 
        : 'User has not connected Gmail account'
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