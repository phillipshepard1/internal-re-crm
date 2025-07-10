import { NextRequest, NextResponse } from 'next/server'
import { HomeStackIntegration } from '@/lib/homeStackIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { limit = 50 } = body

    if (typeof limit !== 'number' || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 200' },
        { status: 400 }
      )
    }

    // Get HomeStack configuration from environment variables
    const homeStackConfig = {
      apiKey: process.env.HOMESTACK_API_KEY!,
      baseUrl: process.env.HOMESTACK_BASE_URL || 'https://api.homestack.com',
      webhookSecret: process.env.HOMESTACK_WEBHOOK_SECRET,
    }
    
    // Validate configuration
    if (!homeStackConfig.apiKey) {
      return NextResponse.json({ 
        error: 'HomeStack API key missing',
        required: ['HOMESTACK_API_KEY']
      }, { status: 400 })
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)
    
    // Fetch and process leads
    const leads = await homeStack.fetchRecentLeads(limit)
    const processedCount = await homeStack.processLeads(leads)
    
    return NextResponse.json({ 
      success: true,
      processedCount,
      message: `Processed ${processedCount} leads from HomeStack`
    })
    
  } catch (err: unknown) {
    console.error('HomeStack processing error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 