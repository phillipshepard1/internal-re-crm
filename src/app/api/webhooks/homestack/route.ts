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
    const signature = request.headers.get('x-homestack-signature')
    
    // Enhanced logging for debugging mobile app issues
    console.log('🔔 HomeStack webhook received:', {
      type: body.type,
      event: body.event,
      action: body.action,
      timestamp: new Date().toISOString(),
      fullBody: JSON.stringify(body, null, 2)
    })

    // Get HomeStack configuration
    const { data: configData, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .eq('enabled', true)
      .single()
    
    if (configError || !configData) {
      console.error('❌ HomeStack integration not configured')
      return NextResponse.json(
        { error: 'HomeStack integration not configured' },
        { status: 400 }
      )
    }

    const homeStackConfig = {
      apiKey: configData.api_key,
      baseUrl: configData.base_url || 'https://api.homestack.com',
      webhookSecret: configData.webhook_secret,
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Enhanced event handling for mobile app compatibility
    const eventType = body.type || body.event || body.action || 'unknown'
    
    // Handle different webhook events with mobile app support
    switch (eventType) {
      // New HomeStack format events
      case 'new_user':
      case 'user.created':
      case 'user.registered':
      case 'user.signup':
      case 'app.user.created':
      case 'mobile.user.created':
        console.log('🔄 Processing new user event (HomeStack format)...')
        return await handleUserCreated(body.data || body.user || body, homeStack)
      
      case 'update_user':
      case 'user.updated':
      case 'user.modified':
        console.log('🔄 Processing update_user event (HomeStack format)...')
        return await handleUserUpdated(body.data || body.user || body, homeStack)
      
      case 'new_chat_message':
      case 'chat.message':
      case 'message.created':
        console.log('🔄 Processing new_chat_message event (HomeStack format)...')
        return await handleChatMessage(body.data || body.message || body, homeStack)
      
      // Lead events
      case 'lead.created':
      case 'lead.updated':
      case 'lead.registered':
      case 'app.lead.created':
      case 'mobile.lead.created':
        console.log('🔄 Processing lead.created event (legacy format)...')
        return await handleLeadCreated(body.data || body.lead || body, homeStack)
      
      // Contact events
      case 'contact.created':
      case 'contact.updated':
      case 'contact.registered':
      case 'app.contact.created':
      case 'mobile.contact.created':
        console.log('🔄 Processing contact.created event (legacy format)...')
        return await handleContactCreated(body.data || body.contact || body, homeStack)
      
      // Generic user events (catch-all for mobile app)
      case 'user':
      case 'app_user':
      case 'mobile_user':
      case 'registration':
      case 'signup':
        console.log('🔄 Processing generic user event (mobile app format)...')
        return await handleUserCreated(body.data || body.user || body, homeStack)
      
      default:
        console.log('⚠️ Unhandled webhook event:', eventType)
        console.log('📋 Available HomeStack events: new_user, update_user, new_chat_message')
        console.log('📋 Legacy events: user.created, lead.created, contact.created')
        console.log('📋 Mobile app events: app.user.created, mobile.user.created, registration')
        console.log('📋 Full webhook body:', JSON.stringify(body, null, 2))
        
        // Try to handle as a user creation if it looks like user data
        if (body.email || body.user?.email || body.data?.email) {
          console.log('🔄 Attempting to process as user creation based on email presence...')
          return await handleUserCreated(body.data || body.user || body, homeStack)
        }
        
        return NextResponse.json({ success: true, message: 'Event ignored' })
    }

  } catch (error) {
    console.error('❌ HomeStack webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enhanced user creation handler for mobile app compatibility
async function handleUserCreated(userData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('🔄 Processing new user from HomeStack:', userData)

    // Handle different HomeStack data formats
    let actualUserData = userData
    
    // If data is nested under 'user' object, extract it
    if (userData.user && typeof userData.user === 'object') {
      actualUserData = userData.user
    }
    
    // If data is nested under 'data' object, extract it
    if (userData.data && typeof userData.data === 'object') {
      actualUserData = userData.data
    }
    
    console.log('📋 Extracted user data:', actualUserData)
    
    // Enhanced data transformation for mobile app compatibility
    const transformedData = {
      id: actualUserData.guid || actualUserData.id || actualUserData.user_id || `user_${Date.now()}`,
      email: actualUserData.email || actualUserData.email_address || actualUserData.user_email,
      first_name: actualUserData.first_name || actualUserData.firstName || 
                 (actualUserData.name ? actualUserData.name.split(' ')[0] : undefined) ||
                 (actualUserData.full_name ? actualUserData.full_name.split(' ')[0] : undefined),
      last_name: actualUserData.last_name || actualUserData.lastName || 
                (actualUserData.name ? actualUserData.name.split(' ').slice(1).join(' ') : undefined) ||
                (actualUserData.full_name ? actualUserData.full_name.split(' ').slice(1).join(' ') : undefined),
      phone: actualUserData.phone || actualUserData.phone_number || actualUserData.mobile || actualUserData.telephone,
      created_at: actualUserData.created_at || actualUserData.createdAt || actualUserData.date_created || actualUserData.registration_date,
      agent_guid: actualUserData.agent_guid || actualUserData.agent_id || actualUserData.assigned_agent,
      // Additional mobile app specific fields
      source: actualUserData.source || actualUserData.signup_source || 'homestack_mobile',
      platform: actualUserData.platform || actualUserData.device_type || 'mobile_app'
    }

    console.log('🔄 Transformed data:', transformedData)

    // Validate required fields
    if (!transformedData.email) {
      console.error('❌ Missing email in user data')
      return NextResponse.json(
        { error: 'Missing email in user data' },
        { status: 400 }
      )
    }

    // Use the new method for user signup handling
    const person = await homeStack.createPersonFromUserSignup(transformedData)

    if (person) {
      console.log('✅ User successfully created in CRM:', person.id)
      
      return NextResponse.json({
        success: true,
        message: 'User successfully imported from HomeStack',
        person_id: person.id,
        assigned_to: person.assigned_to,
        source: transformedData.source,
        platform: transformedData.platform
      })
    } else {
      console.error('❌ Failed to create user in CRM')
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error handling user creation:', error)
    return NextResponse.json(
      { error: 'Failed to process user creation' },
      { status: 500 }
    )
  }
}

// Handle user updates from HomeStack
async function handleUserUpdated(userData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('🔄 Processing user update from HomeStack:', userData)
    
    // For now, just log the update - you can implement update logic later
    console.log('📝 User update received:', userData)
    
    return NextResponse.json({
      success: true,
      message: 'User update received from HomeStack',
      user_id: userData.id
    })

  } catch (error) {
    console.error('❌ Error handling user update:', error)
    return NextResponse.json(
      { error: 'Failed to process user update' },
      { status: 500 }
    )
  }
}

// Handle chat messages from HomeStack
async function handleChatMessage(messageData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('🔄 Processing chat message from HomeStack:', messageData)
    
    // For now, just log the message - you can implement chat handling later
    console.log('💬 Chat message received:', messageData)
    
    return NextResponse.json({
      success: true,
      message: 'Chat message received from HomeStack',
      message_id: messageData.id
    })

  } catch (error) {
    console.error('❌ Error handling chat message:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// Handle new lead from HomeStack
async function handleLeadCreated(leadData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('Processing new lead from HomeStack:', leadData)

    // Use the existing HomeStack integration to process the lead
    const lead = homeStack.transformLeads([leadData])[0]
    const person = await homeStack.createPersonFromLead(lead)

    if (person) {
      return NextResponse.json({
        success: true,
        message: 'Lead successfully imported from HomeStack',
        person_id: person.id
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error handling lead creation:', error)
    return NextResponse.json(
      { error: 'Failed to process lead creation' },
      { status: 500 }
    )
  }
}

// Handle new contact from HomeStack
async function handleContactCreated(contactData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('Processing new contact from HomeStack:', contactData)

    // Similar to lead creation but for contacts
    const lead = homeStack.transformLeads([contactData])[0]
    const person = await homeStack.createPersonFromLead(lead)

    if (person) {
      return NextResponse.json({
        success: true,
        message: 'Contact successfully imported from HomeStack',
        person_id: person.id
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error handling contact creation:', error)
    return NextResponse.json(
      { error: 'Failed to process contact creation' },
      { status: 500 }
    )
  }
} 