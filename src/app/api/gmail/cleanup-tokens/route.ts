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

export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized cleanup request (you can add API key validation here)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_API_KEY
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active Gmail tokens
    const { data: activeTokens, error } = await supabase
      .from('user_gmail_tokens')
      .select('*')
      .eq('is_active', true)

    if (error) {
      throw new Error(`Failed to fetch active tokens: ${error.message}`)
    }

    if (!activeTokens || activeTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tokens to clean up',
        processed: 0,
        deactivated: 0,
        refreshed: 0
      })
    }

    let processed = 0
    let deactivated = 0
    let refreshed = 0

    // Process each token
    for (const token of activeTokens) {
      processed++
      
      if (!token.access_token) {
        // No access token, try to refresh
        if (token.refresh_token) {
          const refreshResult = await refreshAccessToken(token.refresh_token)
          if (refreshResult.success && refreshResult.accessToken) {
            // Update with new token
            await supabase
              .from('user_gmail_tokens')
              .update({
                access_token: refreshResult.accessToken,
                expires_at: refreshResult.expiresAt,
                updated_at: new Date().toISOString()
              })
              .eq('id', token.id)
            refreshed++
          } else {
            // Refresh failed, deactivate
            await supabase
              .from('user_gmail_tokens')
              .update({ is_active: false })
              .eq('id', token.id)
            deactivated++
          }
        } else {
          // No refresh token, deactivate
          await supabase
            .from('user_gmail_tokens')
            .update({ is_active: false })
            .eq('id', token.id)
          deactivated++
        }
        continue
      }

      // Validate current access token
      const isValid = await validateGmailTokens(token.access_token)
      
      if (!isValid) {
        // Token is invalid, try to refresh
        if (token.refresh_token) {
          const refreshResult = await refreshAccessToken(token.refresh_token)
          if (refreshResult.success && refreshResult.accessToken) {
            // Update with new token
            await supabase
              .from('user_gmail_tokens')
              .update({
                access_token: refreshResult.accessToken,
                expires_at: refreshResult.expiresAt,
                updated_at: new Date().toISOString()
              })
              .eq('id', token.id)
            refreshed++
          } else {
            // Refresh failed, deactivate
            await supabase
              .from('user_gmail_tokens')
              .update({ is_active: false })
              .eq('id', token.id)
            deactivated++
          }
        } else {
          // No refresh token, deactivate
          await supabase
            .from('user_gmail_tokens')
            .update({ is_active: false })
            .eq('id', token.id)
          deactivated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Token cleanup completed`,
      processed,
      deactivated,
      refreshed,
      summary: {
        total: processed,
        valid: processed - deactivated - refreshed,
        refreshed,
        deactivated
      }
    })

  } catch (error) {
    console.error('Token cleanup error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clean up tokens'
      },
      { status: 500 }
    )
  }
} 