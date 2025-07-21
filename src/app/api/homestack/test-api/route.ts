import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
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

    const homeStackConfig = {
      apiKey: configData.api_key,
      baseUrl: configData.base_url || 'https://pbapi.homestack.com',
      webhookSecret: configData.webhook_secret,
    }

    console.log('🧪 Testing HomeStack API configuration...')
    console.log('🧪 Base URL:', homeStackConfig.baseUrl)
    console.log('🧪 API Key present:', !!homeStackConfig.apiKey)

    // Test 1: Try to get app info
    console.log('🧪 Test 1: Getting app info...')
    const appResponse = await fetch(`${homeStackConfig.baseUrl}/app`, {
      headers: {
        'Authorization': `Bearer ${homeStackConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    
    console.log('🧪 App response status:', appResponse.status)
    
    if (appResponse.ok) {
      const appData = await appResponse.json()
      console.log('✅ App info retrieved:', appData)
    } else {
      const appError = await appResponse.text()
      console.error('❌ App info failed:', appError)
    }

    // Test 2: Try to get webhooks
    console.log('🧪 Test 2: Getting webhooks...')
    const webhookResponse = await fetch(`${homeStackConfig.baseUrl}/app/webhooks`, {
      headers: {
        'Authorization': `Bearer ${homeStackConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    
    console.log('🧪 Webhook response status:', webhookResponse.status)
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json()
      console.log('✅ Webhooks retrieved:', webhookData)
    } else {
      const webhookError = await webhookResponse.text()
      console.error('❌ Webhooks failed:', webhookError)
    }

    return NextResponse.json({
      success: true,
      message: 'API tests completed - check server logs for details',
      config: {
        baseUrl: homeStackConfig.baseUrl,
        apiKeyPresent: !!homeStackConfig.apiKey,
        webhookSecretPresent: !!homeStackConfig.webhookSecret
      }
    })

  } catch (error) {
    console.error('❌ API test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 