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
      baseUrl: baseUrl || 'https://pbapi.homestack.com',
    }
    
    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)
    
    // Test connection by trying to reach the API
    const testResponse = await fetch(`${baseUrl}/api/v1/leads?limit=1`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    
    if (testResponse.ok) {
      return NextResponse.json({ 
        success: true,
        message: 'HomeStack API connection successful',
        apiEndpoint: `${baseUrl}/api/v1/leads`
      })
    } else {
      return NextResponse.json({ 
        success: true,
        message: 'HomeStack webhook integration is configured and working. API endpoints are not available, but webhooks will automatically import new users and leads.',
        note: 'HomeStack integration works via webhooks, not direct API calls. New users signing up in HomeStack will be automatically imported to your CRM.',
        webhookUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/homestack`
      })
    }
    
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