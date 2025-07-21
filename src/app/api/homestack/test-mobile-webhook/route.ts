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

    if (webhookFormat === 'mobile_app') {
      // Mobile app specific format
      testPayload = {
        type: eventType,
        data: {
          user_id: testData?.user_id || 'mobile_user_123',
          email: testData?.email || 'mobileuser@example.com',
          first_name: testData?.first_name || 'Mobile',
          last_name: testData?.last_name || 'User',
          phone_number: testData?.phone_number || '+1234567890',
          created_at: testData?.created_at || new Date().toISOString(),
          source: 'homestack_mobile',
          device_info: testData?.device_info || 'iOS App v2.1.0',
          platform: 'mobile'
        }
      }
    } else if (webhookFormat === 'app_specific') {
      // App-specific format
      testPayload = {
        type: eventType,
        data: {
          id: testData?.id || 'app_user_456',
          email_address: testData?.email_address || 'appuser@example.com',
          firstName: testData?.firstName || 'App',
          lastName: testData?.lastName || 'User',
          mobile: testData?.mobile || '+1234567890',
          registration_date: testData?.registration_date || new Date().toISOString(),
          platform: 'mobile_app',
          device: testData?.device || 'Android App v1.5.2'
        }
      }
    } else {
      // Default mobile format
      testPayload = {
        type: eventType,
        data: {
          guid: testData?.guid || 'mobile_guid_789',
          email: testData?.email || 'defaultmobile@example.com',
          name: testData?.name || 'Default Mobile User',
          phone: testData?.phone || '+1234567890',
          created_at: testData?.created_at || new Date().toISOString(),
          source: 'mobile_app',
          device_info: testData?.device_info || 'Mobile App'
        }
      }
    }

    console.log('🧪 Test payload:', JSON.stringify(testPayload, null, 2))

    // Process the test webhook
    const result = await processWebhookPayload(testPayload, homeStack)

    return NextResponse.json({
      success: true,
      testPayload,
      result,
      message: 'Mobile webhook test completed'
    })

  } catch (error) {
    console.error('❌ Error testing mobile webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to process webhook payload
async function processWebhookPayload(payload: any, homeStack: HomeStackIntegration) {
  try {
    console.log('🔄 Processing webhook payload:', payload.type)

    switch (payload.type) {
      case 'mobile.user.created':
      case 'mobile.user.registered':
      case 'app.user.created':
      case 'app.user.registered':
        console.log('📱 Processing mobile user creation')
        return await handleUserCreated(payload.data, homeStack)
      
      case 'mobile.lead.created':
      case 'app.lead.created':
        console.log('📱 Processing mobile lead creation')
        return await handleLeadCreated(payload.data, homeStack)
      
      default:
        console.log('⚠️ Unknown event type:', payload.type)
        return { success: false, error: 'Unknown event type' }
    }
  } catch (error) {
    console.error('❌ Error processing webhook payload:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Handle user creation (same as in main webhook handler)
async function handleUserCreated(userData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('📋 Processing user data:', JSON.stringify(userData, null, 2))
    
    const transformedData = {
      id: userData.guid || userData.id || userData.user_id || userData.userId,
      email: userData.email || userData.email_address || userData.user_email,
      first_name: userData.first_name || userData.firstName || (userData.name ? userData.name.split(' ')[0] : undefined),
      last_name: userData.last_name || userData.lastName || (userData.name ? userData.name.split(' ').slice(1).join(' ') : undefined),
      phone: userData.phone || userData.phone_number || userData.mobile || userData.contact_number,
      created_at: userData.created_at || userData.createdAt || userData.registration_date || userData.signup_date,
      agent_guid: userData.agent_guid || userData.agent_id || userData.assigned_agent,
      source: userData.source || userData.platform || 'homestack_mobile',
      device_info: userData.device_info || userData.device || userData.platform_info
    }

    const person = await homeStack.createPersonFromUserSignup(transformedData)

    if (person) {
      return {
        success: true,
        message: 'Mobile user successfully created in CRM',
        person_id: person.id,
        assigned_to: person.assigned_to
      }
    } else {
      return {
        success: false,
        error: 'Failed to create mobile user in CRM'
      }
    }

  } catch (error) {
    console.error('❌ Error handling mobile user creation:', error)
    return {
      success: false,
      error: 'Failed to process mobile user creation'
    }
  }
}

// Handle lead creation (same as in main webhook handler)
async function handleLeadCreated(leadData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('📱 Processing mobile lead:', leadData)

    const lead = homeStack.transformLeads([leadData])[0]
    const person = await homeStack.createPersonFromLead(lead)

    if (person) {
      return {
        success: true,
        message: 'Mobile lead successfully created in CRM',
        person_id: person.id
      }
    } else {
      return {
        success: false,
        error: 'Failed to create mobile lead in CRM'
      }
    }

  } catch (error) {
    console.error('❌ Error handling mobile lead creation:', error)
    return {
      success: false,
      error: 'Failed to process mobile lead creation'
    }
  }
} 