import { NextRequest, NextResponse } from 'next/server'
import { HomeStackIntegration } from '@/lib/homeStackIntegration'
import { createClient } from '@supabase/supabase-js'

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
    const { eventType = 'mobile.user.created', testData, webhookFormat } = body

    console.log('🧪 Testing mobile app webhook format:', { eventType, webhookFormat, testData })

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

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Test different mobile app webhook formats
    let testPayload: any = {}
    
    switch (webhookFormat) {
      case 'mobile_app_v1':
        testPayload = {
          type: 'mobile.user.created',
          data: testData || {
            id: `mobile_user_${Date.now()}`,
            email: `mobileuser${Date.now()}@example.com`,
            first_name: 'Mobile',
            last_name: 'User',
            phone: '+1234567890',
            created_at: new Date().toISOString(),
            source: 'homestack_mobile',
            platform: 'mobile_app'
          }
        }
        break
        
      case 'mobile_app_v2':
        testPayload = {
          event: 'user.created',
          user: testData || {
            guid: `mobile_guid_${Date.now()}`,
            email_address: `mobileuser${Date.now()}@example.com`,
            name: 'Mobile Test User',
            phone_number: '+1234567890',
            created_at: new Date().toISOString(),
            signup_source: 'mobile_app',
            device_type: 'ios'
          }
        }
        break
        
      case 'mobile_app_v3':
        testPayload = {
          action: 'registration',
          data: testData || {
            user_id: `mobile_user_${Date.now()}`,
            email: `mobileuser${Date.now()}@example.com`,
            full_name: 'Mobile Test User',
            mobile: '+1234567890',
            registration_date: new Date().toISOString(),
            source: 'homestack_mobile',
            platform: 'android'
          }
        }
        break
        
      case 'generic_mobile':
        testPayload = {
          email: `mobileuser${Date.now()}@example.com`,
          first_name: 'Mobile',
          last_name: 'User',
          phone: '+1234567890',
          created_at: new Date().toISOString(),
          source: 'homestack_mobile',
          platform: 'mobile_app'
        }
        break
        
      default:
        testPayload = {
          type: 'mobile.user.created',
          data: testData || {
            id: `mobile_user_${Date.now()}`,
            email: `mobileuser${Date.now()}@example.com`,
            first_name: 'Mobile',
            last_name: 'User',
            phone: '+1234567890',
            created_at: new Date().toISOString(),
            source: 'homestack_mobile',
            platform: 'mobile_app'
          }
        }
    }

    console.log('🧪 Test payload:', JSON.stringify(testPayload, null, 2))

    // Simulate the webhook processing
    const userData = testPayload.data || testPayload.user || testPayload
    
    const person = await homeStack.createPersonFromUserSignup({
      id: userData.id || userData.guid || userData.user_id || `user_${Date.now()}`,
      email: userData.email || userData.email_address || userData.user_email,
      first_name: userData.first_name || userData.firstName || 
                 (userData.name ? userData.name.split(' ')[0] : undefined) ||
                 (userData.full_name ? userData.full_name.split(' ')[0] : undefined),
      last_name: userData.last_name || userData.lastName || 
                (userData.name ? userData.name.split(' ').slice(1).join(' ') : undefined) ||
                (userData.full_name ? userData.full_name.split(' ').slice(1).join(' ') : undefined),
      phone: userData.phone || userData.phone_number || userData.mobile || userData.telephone,
      created_at: userData.created_at || userData.createdAt || userData.date_created || userData.registration_date,
      source: userData.source || userData.signup_source || 'homestack_mobile',
      platform: userData.platform || userData.device_type || 'mobile_app'
    })
    
    if (person) {
      return NextResponse.json({
        success: true,
        message: 'Mobile app webhook test successful',
        person_id: person.id,
        assigned_to: person.assigned_to,
        test_payload: testPayload,
        processed_data: {
          id: userData.id || userData.guid || userData.user_id,
          email: userData.email || userData.email_address || userData.user_email,
          first_name: userData.first_name || userData.firstName,
          last_name: userData.last_name || userData.lastName,
          phone: userData.phone || userData.phone_number || userData.mobile,
          source: userData.source || userData.signup_source,
          platform: userData.platform || userData.device_type
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to create test user from mobile app webhook' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Mobile app webhook test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 