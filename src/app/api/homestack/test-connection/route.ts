import { NextRequest, NextResponse } from 'next/server'
import { HomeStackIntegration } from '@/lib/homeStackIntegration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, baseUrl } = body
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      )
    }
    
    const homeStackConfig = {
      apiKey,
      baseUrl: baseUrl || 'https://api.homestack.com',
    }
    
    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)
    
    // Test connection by fetching a small number of leads
    const leads = await homeStack.fetchRecentLeads(1)
    
    return NextResponse.json({ 
      success: true,
      message: 'HomeStack connection successful',
      leadsFound: leads.length,
      apiEndpoint: `${baseUrl}/api/v1/leads`
    })
    
  } catch (error) {
    console.error('HomeStack connection test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to HomeStack API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 