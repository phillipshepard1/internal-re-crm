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
    const { userEmail } = body

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      )
    }

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

    if (!configData.sso_enabled) {
      return NextResponse.json(
        { error: 'HomeStack SSO is not enabled' },
        { status: 400 }
      )
    }

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

    // Generate SSO login URL
    const result = await homeStack.generateSSOLoginURL(userEmail)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate SSO login URL' },
        { status: 500 }
      )
    }

    // Log SSO login attempt
    console.log('🔐 HomeStack SSO login generated for:', userEmail)

    return NextResponse.json({
      success: true,
      loginUrl: result.loginUrl,
      message: 'SSO login URL generated successfully'
    })

  } catch (error) {
    console.error('❌ HomeStack SSO login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 