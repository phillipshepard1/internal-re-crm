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

    // Verify user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Gmail OAuth configuration
    const clientId = process.env.GMAIL_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gmail/setup/callback`
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Gmail client ID not configured' },
        { status: 500 }
      )
    }

    // Generate OAuth state parameter for security
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64')

    // Build Gmail OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/userinfo.email')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state
    })

  } catch (error) {
    console.error('Error generating Gmail auth URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 