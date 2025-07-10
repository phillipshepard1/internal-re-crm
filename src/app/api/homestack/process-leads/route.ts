import { NextResponse } from 'next/server'
import { HomeStackIntegration } from '@/lib/homeStackIntegration'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { limit = 50 } = body
    
    // Get HomeStack configuration from environment variables
    const homeStackConfig = {
      apiKey: process.env.HOMESTACK_API_KEY!,
      baseUrl: process.env.HOMESTACK_BASE_URL!,
      webhookSecret: process.env.HOMESTACK_WEBHOOK_SECRET,
    }
    
    // Validate configuration
    if (!homeStackConfig.apiKey || !homeStackConfig.baseUrl) {
      return NextResponse.json({ 
        error: 'HomeStack configuration missing',
        required: ['HOMESTACK_API_KEY', 'HOMESTACK_BASE_URL']
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
      totalLeads: leads.length,
      message: `Processed ${processedCount} leads from HomeStack`
    })
    
  } catch (error: any) {
    console.error('Error processing HomeStack leads:', error)
    return NextResponse.json({ 
      error: 'Failed to process HomeStack leads',
      details: error.message 
    }, { status: 500 })
  }
} 