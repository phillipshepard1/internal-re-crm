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

export async function GET(request: Request) {
  return await POST(request)
}

export async function POST(request: Request) {
  try {
    // Get HomeStack configuration from database
    const { data: configData, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .eq('enabled', true)
      .single()

    if (configError || !configData) {
      return NextResponse.json(
        { success: false, error: 'HomeStack integration not configured' },
        { status: 400 }
      )
    }

    const homeStackConfig = {
      apiKey: configData.api_key,
      baseUrl: configData.base_url || 'https://api.homestack.com',
      ssoApiKey: configData.sso_api_key,
      ssoBaseUrl: configData.sso_base_url || 'https://bkapi.homestack.com',
      ssoBrokerUrl: configData.sso_broker_url || 'https://broker.homestack.com'
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Test SSO connection
    const result = await homeStack.testSSOConnection()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 