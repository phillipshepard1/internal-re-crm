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
      _id: body._id,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })
    
    // Log the full payload for debugging
    console.log('📋 Full webhook payload:', JSON.stringify(body, null, 2))

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

    // Handle different webhook events
    switch (body.type) {
      case 'new_user':
        console.log('🔄 Processing new_user event (HomeStack format)...')
        return await handleUserCreated(body.data, homeStack)
      
      case 'update_user':
        console.log('🔄 Processing update_user event (HomeStack format)...')
        return await handleUserUpdated(body.data, homeStack)
      
      case 'new_chat_message':
        console.log('🔄 Processing new_chat_message event (HomeStack format)...')
        return await handleChatMessage(body.data, homeStack)
      
      // Mobile app specific events
      case 'mobile.user.created':
      case 'mobile.user.registered':
      case 'app.user.created':
      case 'app.user.registered':
        console.log('📱 Processing mobile app user creation event:', body.type)
        return await handleUserCreated(body.data, homeStack)
      
      case 'mobile.lead.created':
      case 'app.lead.created':
        console.log('📱 Processing mobile app lead creation event:', body.type)
        return await handleLeadCreated(body.data, homeStack)
      
      case 'mobile.contact.created':
      case 'app.contact.created':
        console.log('📱 Processing mobile app contact creation event:', body.type)
        return await handleContactCreated(body.data, homeStack)
      
      // Keep backward compatibility with old event types
      case 'user.created':
      case 'user.registered':
        console.log('🔄 Processing user.created event (legacy format)...')
        return await handleUserCreated(body.data, homeStack)
      
      case 'lead.created':
      case 'lead.updated':
        console.log('🔄 Processing lead.created event (legacy format)...')
        return await handleLeadCreated(body.data, homeStack)
      
      case 'contact.created':
      case 'contact.updated':
        console.log('🔄 Processing contact.created event (legacy format)...')
        return await handleContactCreated(body.data, homeStack)
      
      default:
        console.log('⚠️ Unhandled webhook event:', body.type)
        console.log('Available HomeStack events: new_user, update_user, new_chat_message')
        console.log('Mobile app events: mobile.user.created, mobile.lead.created, app.user.created')
        console.log('Legacy events: user.created, lead.created, contact.created')
        console.log('📋 Full webhook payload for debugging:', JSON.stringify(body, null, 2))
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

// Handle new user signup from HomeStack
async function handleUserCreated(userData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('Processing new user from HomeStack')

    // Handle different HomeStack data formats
    let actualUserData = userData
    
    // If data is nested under 'user' object, extract it
    if (userData.user && typeof userData.user === 'object') {
      actualUserData = userData.user
    }
    
    // Handle the exact format from HomeStack documentation
    if (userData.guid || userData.name || userData.email) {
      actualUserData = userData
    }
    
    console.log('📋 Processing user data:', JSON.stringify(actualUserData, null, 2))
    
    // Transform HomeStack format to our expected format
    const transformedData = {
      id: actualUserData.guid || actualUserData.id || actualUserData.user_id || actualUserData.userId, // Handle different ID fields
      email: actualUserData.email || actualUserData.email_address || actualUserData.user_email,
      first_name: actualUserData.first_name || actualUserData.firstName || (actualUserData.name ? actualUserData.name.split(' ')[0] : undefined),
      last_name: actualUserData.last_name || actualUserData.lastName || (actualUserData.name ? actualUserData.name.split(' ').slice(1).join(' ') : undefined),
      phone: actualUserData.phone || actualUserData.phone_number || actualUserData.mobile || actualUserData.contact_number,
      created_at: actualUserData.created_at || actualUserData.createdAt || actualUserData.registration_date || actualUserData.signup_date,
      agent_guid: actualUserData.agent_guid || actualUserData.agent_id || actualUserData.assigned_agent,
      // Mobile app specific fields
      source: actualUserData.source || actualUserData.platform || 'homestack_mobile',
      device_info: actualUserData.device_info || actualUserData.device || actualUserData.platform_info
    }

    // Use the new method for user signup handling
    const person = await homeStack.createPersonFromUserSignup(transformedData)

    if (person) {
      console.log('User successfully created in CRM:', person.id)
      
      return NextResponse.json({
        success: true,
        message: 'User successfully imported from HomeStack',
        person_id: person.id,
        assigned_to: person.assigned_to
      })
    } else {
      console.error('Failed to create user in CRM')
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