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
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=${error}`
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=${error}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=missing_params`
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=missing_params`
      )
    }

    // Decode state parameter
    let userId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = stateData.userId
    } catch (error) {
      return NextResponse.redirect(
        // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=invalid_state`
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=invalid_state`
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/gmail/setup/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(
        // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=token_exchange_failed`
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=token_exchange_failed`
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user's Gmail email address
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    let gmailEmail = ''
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json()
      gmailEmail = userInfo.email
    }

    // Deactivate any existing tokens for this user
    await supabase
      .from('user_gmail_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)

    // Store the new tokens
    const { error: insertError } = await supabase
      .from('user_gmail_tokens')
      .insert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_at: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        scope: tokenData.scope,
        gmail_email: gmailEmail,
        is_active: true
      })

    if (insertError) {
      console.error('Error storing Gmail tokens:', insertError)
      return NextResponse.redirect(
        // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=storage_failed`
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=storage_failed`
      )
    }

    // Redirect back to settings/gmail-connection with success (was inbox)
    return NextResponse.redirect(
      // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?success=true&email=${encodeURIComponent(gmailEmail)}`
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?success=true&email=${encodeURIComponent(gmailEmail)}`
    )

  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(
      // `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/inbox?error=callback_failed`
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings/gmail-connection?error=callback_failed`
    )
  }
} 