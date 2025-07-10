import { NextResponse } from 'next/server'
import { GmailIntegration } from '@/lib/gmailIntegration'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { maxResults = 10 } = body
    
    // Get Gmail configuration from environment variables
    const gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      emailAddress: process.env.GMAIL_EMAIL_ADDRESS!,
    }
    
    // Validate configuration
    if (!gmailConfig.clientId || !gmailConfig.clientSecret || !gmailConfig.refreshToken) {
      return NextResponse.json({ 
        error: 'Gmail configuration missing',
        required: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
      }, { status: 400 })
    }
    
    // Initialize Gmail integration
    const gmail = new GmailIntegration(gmailConfig)
    const initialized = await gmail.initialize()
    
    if (!initialized) {
      return NextResponse.json({ 
        error: 'Failed to initialize Gmail integration' 
      }, { status: 500 })
    }
    
    // Process recent emails
    const processedCount = await gmail.processRecentEmails(maxResults)
    
    return NextResponse.json({ 
      success: true,
      processedCount,
      message: `Processed ${processedCount} leads from Gmail`
    })
    
  } catch (error: any) {
    console.error('Error processing Gmail emails:', error)
    return NextResponse.json({ 
      error: 'Failed to process emails',
      details: error.message 
    }, { status: 500 })
  }
} 