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
    const { userId, revokeAccess = false } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's current Gmail tokens
    const { data: userTokens, error: fetchError } = await supabase
      .from('user_gmail_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (fetchError || !userTokens) {
      return NextResponse.json({
        success: false,
        error: 'No active Gmail connection found for this user'
      }, { status: 404 })
    }

    // Optionally revoke access with Google
    if (revokeAccess && userTokens.access_token) {
      try {
        const revokeResponse = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: userTokens.refresh_token || userTokens.access_token,
          }),
        })

        if (!revokeResponse.ok) {
          console.warn('Failed to revoke Google access token:', await revokeResponse.text())
        } else {
          console.log('Successfully revoked Google access token')
        }
      } catch (error) {
        console.error('Error revoking Google access token:', error)
        // Continue with local deactivation even if Google revocation fails
      }
    }

    // Deactivate all tokens for this user
    const { error: deactivateError } = await supabase
      .from('user_gmail_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)

    if (deactivateError) {
      console.error('Error deactivating Gmail tokens:', deactivateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to disconnect Gmail account'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail account disconnected successfully'
    })

  } catch (error) {
    console.error('Gmail disconnect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 