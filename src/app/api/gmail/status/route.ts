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

// Validate Gmail tokens by making a test API call
async function validateGmailTokens(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    return response.ok
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

// Attempt to refresh access token
async function refreshAccessToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; expiresAt?: string }> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    if (!response.ok) {
      return { success: false }
    }
    
    const data = await response.json()
    const expiresAt = data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined
    
    return { 
      success: true, 
      accessToken: data.access_token, 
      expiresAt 
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return { success: false }
  }
}

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
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error || !userTokens) {
      return NextResponse.json({
        connected: false,
        configured: {
          clientId: hasClientId,
          clientSecret: hasClientSecret
        },
        userConnected: false,
        gmailEmail: null,
        connectedAt: null,
        lastUpdated: null,
        message: 'User has not connected Gmail account'
      })
    }

    // Validate current access token
    let isValid = false
    let needsRefresh = false
    let refreshedToken = null

    if (userTokens.access_token) {
      isValid = await validateGmailTokens(userTokens.access_token)
      
      // If token is invalid, try to refresh it
      if (!isValid && userTokens.refresh_token) {
        const refreshResult = await refreshAccessToken(userTokens.refresh_token)
        
        if (refreshResult.success && refreshResult.accessToken) {
          // Update the database with new token
          await supabase
            .from('user_gmail_tokens')
            .update({
              access_token: refreshResult.accessToken,
              expires_at: refreshResult.expiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_active', true)
          
          refreshedToken = refreshResult.accessToken
          isValid = true
          needsRefresh = true
        } else {
          // Refresh failed, mark connection as inactive
          await supabase
            .from('user_gmail_tokens')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true)
          
          return NextResponse.json({
            connected: false,
            configured: {
              clientId: hasClientId,
              clientSecret: hasClientSecret
            },
            userConnected: false,
            gmailEmail: userTokens.gmail_email,
            connectedAt: userTokens.created_at,
            lastUpdated: userTokens.updated_at,
            message: 'Gmail connection expired. Please reconnect your account.',
            requiresReconnect: true
          })
        }
      }
    }

    return NextResponse.json({
      connected: isValid,
      configured: {
        clientId: hasClientId,
        clientSecret: hasClientSecret
      },
      userConnected: isValid,
      gmailEmail: userTokens.gmail_email,
      connectedAt: userTokens.created_at,
      lastUpdated: userTokens.updated_at,
      tokenRefreshed: needsRefresh,
      message: isValid 
        ? `Gmail connected: ${userTokens.gmail_email}${needsRefresh ? ' (token refreshed)' : ''}` 
        : 'Gmail connection is invalid'
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