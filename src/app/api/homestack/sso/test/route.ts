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
    // Get HomeStack configuration
    const { data: configData, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .eq('enabled', true)
      .single()
    
    if (configError || !configData) {
      return NextResponse.json(
        { error: 'HomeStack integration not configured' },
        { status: 400 }
      )
    }

    console.log('🔍 SSO Test - Config from DB:', {
      sso_enabled: configData.sso_enabled,
      sso_api_key: configData.sso_api_key ? '***' : 'MISSING',
      sso_base_url: configData.sso_base_url,
      sso_broker_url: configData.sso_broker_url
    })

    const homeStackConfig = {
      apiKey: configData.api_key,
      baseUrl: configData.base_url || 'https://api.homestack.com',
      webhookSecret: configData.webhook_secret,
      // SSO configuration
      ssoEnabled: configData.sso_enabled,
      ssoApiKey: configData.sso_api_key,
      ssoBaseUrl: configData.sso_base_url || 'https://bkapi.homestack.com',
      ssoBrokerUrl: configData.sso_broker_url || 'https://broker.homestack.com',
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Test SSO connection
    const result = await homeStack.testSSOConnection()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      ssoEnabled: configData.sso_enabled,
      ssoConfigured: !!configData.sso_api_key
    })

  } catch (error) {
    console.error('❌ HomeStack SSO test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 