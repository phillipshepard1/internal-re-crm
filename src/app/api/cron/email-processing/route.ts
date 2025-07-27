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
    // Verify this is an authorized cron job request
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET_TOKEN}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting automated email processing...')

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
        processedCount: 0
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

        console.log(`Processed ${processedCount} leads from ${token.gmail_email} using person-based detection`)

      } catch (error) {
        console.error(`Error processing emails for user ${token.user_id}:`, error)
        results.push({
          userId: token.user_id,
          email: token.gmail_email || '',
          processed: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log summary
    const successfulResults = results.filter(r => !r.error)
    const failedResults = results.filter(r => r.error)

    console.log(`Email processing completed: ${totalProcessed} leads processed from ${successfulResults.length} users`)
    if (failedResults.length > 0) {
      console.log(`Failed processing for ${failedResults.length} users`)
    }

    return NextResponse.json({
      success: true,
      message: `Automated email processing completed`,
      summary: {
        totalProcessed,
        totalUsers: gmailTokens.length,
        successfulUsers: successfulResults.length,
        failedUsers: failedResults.length
      },
      results
    })

  } catch (error) {
    console.error('Automated email processing error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Automated Email Processing Cron Job',
    description: 'Processes new emails from Gmail integrations and creates leads automatically',
    usage: 'POST with authorization header containing CRON_SECRET_TOKEN',
    schedule: 'Recommended: Run every 15-30 minutes',
    features: [
      'Monitors all active Gmail integrations',
      'Automatically processes new emails as leads',
      'Uses AI-powered lead detection with person-based duplicate prevention',
      'Creates new leads or updates existing leads based on person matching',
      'Creates leads in staging for admin review'
    ]
  })
} 