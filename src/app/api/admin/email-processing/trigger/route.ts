import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GmailIntegration } from '@/lib/gmailIntegration'

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
    console.log('Starting admin-triggered email processing...')

    // Get all active Gmail integrations
    const { data: gmailTokens, error: tokensError } = await supabase
      .from('user_gmail_tokens')
      .select('*')
      .eq('is_active', true)

    if (tokensError) {
      console.error('Error fetching Gmail tokens:', tokensError)
      return NextResponse.json(
        { error: 'Failed to fetch Gmail tokens' },
        { status: 500 }
      )
    }

    if (!gmailTokens || gmailTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active Gmail integrations found',
        summary: {
          totalProcessed: 0,
          totalUsers: 0,
          successfulUsers: 0,
          failedUsers: 0
        },
        results: []
      })
    }

    let totalProcessed = 0
    const results: Array<{
      userId: string
      email: string
      processed: number
      error?: string
    }> = []

    // Process emails for each active Gmail integration
    for (const token of gmailTokens) {
      try {
        console.log(`Processing emails for user ${token.user_id} (${token.gmail_email})`)

        // Create Gmail integration instance
        const gmailConfig = {
          clientId: process.env.GMAIL_CLIENT_ID!,
          clientSecret: process.env.GMAIL_CLIENT_SECRET!,
          refreshToken: token.refresh_token,
          accessToken: token.access_token,
          emailAddress: token.gmail_email || ''
        }

        const gmail = new GmailIntegration(gmailConfig, token.user_id)
        
        // Initialize Gmail connection
        const initialized = await gmail.initialize()
        if (!initialized) {
          results.push({
            userId: token.user_id,
            email: token.gmail_email || '',
            processed: 0,
            error: 'Failed to initialize Gmail connection'
          })
          continue
        }

        // Process recent emails (check last 20 emails)
        const processedCount = await gmail.processRecentEmails(20)
        
        totalProcessed += processedCount
        results.push({
          userId: token.user_id,
          email: token.gmail_email || '',
          processed: processedCount
        })

        console.log(`Processed ${processedCount} emails for ${token.gmail_email}`)

      } catch (error) {
        console.error(`Error processing emails for ${token.gmail_email}:`, error)
        results.push({
          userId: token.user_id,
          email: token.gmail_email || '',
          processed: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate summary
    const successfulUsers = results.filter(r => !r.error).length
    const failedUsers = results.filter(r => r.error).length

    const summary = {
      totalProcessed,
      totalUsers: gmailTokens.length,
      successfulUsers,
      failedUsers
    }

    console.log('Admin-triggered email processing completed:', summary)

    return NextResponse.json({
      success: true,
      message: 'Admin-triggered email processing completed',
      summary,
      results
    })

  } catch (error) {
    console.error('Error in admin-triggered email processing:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 