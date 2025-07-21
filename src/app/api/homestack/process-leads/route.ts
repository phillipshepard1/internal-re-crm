import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { HomeStackIntegration } from '@/lib/homeStackIntegration'

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
    const body = await request.json()
    const { limit = 50 } = body

    if (typeof limit !== 'number' || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 200' },
        { status: 400 }
      )
    }

    // Get HomeStack configuration from database
    const { data: configData, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .eq('enabled', true)
      .single()
    
    if (configError || !configData) {
      return NextResponse.json({ 
        error: 'HomeStack integration not configured or disabled',
        required: ['API key must be configured in admin panel']
      }, { status: 400 })
    }
    
    const homeStackConfig = {
      apiKey: configData.api_key,
      baseUrl: configData.base_url || 'https://pbapi.homestack.com',
      webhookSecret: configData.webhook_secret,
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)
    
    // Since HomeStack API endpoints are not available, 
    // we'll return information about the webhook-based integration
    return NextResponse.json({ 
      success: true,
      processedCount: 0,
      message: `HomeStack integration is webhook-based. New users and leads are automatically imported via webhooks when they sign up in HomeStack.`,
      note: "The 'Import Recent Leads' feature is not available as HomeStack doesn't provide a public API for fetching historical data. All new leads are automatically imported via webhooks."
    })
    
  } catch (err: unknown) {
    console.error('HomeStack processing error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 