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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event, zap_id, data } = body

    console.log('🔔 HomeStack webhook received:', { event, zap_id, data })

    // Validate webhook signature if configured (temporarily disabled for debugging)
    const signature = request.headers.get('x-homestack-signature')
    if (!signature) {
      console.log('⚠️ Missing webhook signature - continuing for debugging')
      // return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Get HomeStack configuration
    const { data: configData, error: configError } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .eq('enabled', true)
      .single()
    
    if (configError || !configData) {
      console.log('❌ HomeStack integration not configured:', configError)
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

    // Process webhook based on event type
    const eventType = event || data?.type || body.type
    console.log('🔔 Processing event type:', eventType)

    if (eventType === 'new_user') {
      console.log('👤 Processing new_user event')
      return await handleUserCreated(data, homeStack, eventType)
    } else if (eventType === 'update_user') {
      return await handleUserUpdated(data, homeStack)
    } else if (eventType === 'new_chat_message') {
      return await handleChatMessage(data, homeStack)
    } else if (eventType === 'mobile.user.created') {
      console.log('📱 Processing mobile.user.created event')
      return await handleUserCreated(data, homeStack, eventType)
    } else if (eventType === 'mobile.lead.created') {
      return await handleLeadCreated(data, homeStack)
    } else if (eventType === 'mobile.contact.created') {
      return await handleContactCreated(data, homeStack)
    } else if (eventType === 'user.created') {
      console.log('👤 Processing user.created event')
      return await handleUserCreated(data, homeStack, eventType)
    } else if (eventType === 'lead.created') {
      return await handleLeadCreated(data, homeStack)
    } else if (eventType === 'contact.created') {
      return await handleContactCreated(data, homeStack)
    } else {
      console.log('⚠️ Unhandled event type:', eventType)
      return NextResponse.json({ 
        success: true, 
        message: 'Event received but not processed',
        event_type: eventType 
      })
    }
  } catch (error) {
    console.error('❌ Error processing HomeStack webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle new user signup from HomeStack
async function handleUserCreated(userData: any, homeStack: HomeStackIntegration, eventType?: string) {
  try {
    console.log('👤 handleUserCreated called with:', { userData, eventType })
    
    // Handle different HomeStack data formats
    let actualUserData = userData
    
    // If data is nested under 'user' object, extract it
    if (userData.user && typeof userData.user === 'object') {
      actualUserData = userData.user
      console.log('📦 Extracted user data from nested object')
    }
    
    // Handle the exact format from HomeStack documentation
    if (userData.guid || userData.name || userData.email) {
      actualUserData = userData
      console.log('📋 Using direct user data format')
    }
    
    // Determine source - always HomeStack for this webhook endpoint
    let source = 'homestack' // This webhook is specifically for HomeStack
    if (actualUserData.source && actualUserData.source !== 'homestack') {
      // Only override if it's a different source (not HomeStack)
      source = actualUserData.source
    } else if (actualUserData.platform && actualUserData.platform !== 'homestack') {
      // Only override if it's a different platform (not HomeStack)
      source = actualUserData.platform
    }
    
    // Transform HomeStack format to our expected format
    const transformedData = {
      id: actualUserData.guid || actualUserData.id || actualUserData.user_id || actualUserData.userId, // Handle different ID fields
      email: actualUserData.email || actualUserData.email_address || actualUserData.user_email,
      first_name: actualUserData.first_name || actualUserData.firstName || (actualUserData.name ? actualUserData.name.split(' ')[0] : undefined),
      last_name: actualUserData.last_name || actualUserData.lastName || (actualUserData.name ? actualUserData.name.split(' ').slice(1).join(' ') : undefined),
      phone: actualUserData.phone || actualUserData.phone_number || actualUserData.mobile || actualUserData.contact_number,
      created_at: actualUserData.created_at || actualUserData.createdAt || actualUserData.registration_date || actualUserData.signup_date,
      agent_guid: actualUserData.agent_guid || actualUserData.agent_id || actualUserData.assigned_agent,
      // Use determined source instead of defaulting to mobile
      source: source,
      device_info: actualUserData.device_info || actualUserData.device || actualUserData.platform_info
    }

    // Use the new method for user signup handling
    const person = await homeStack.createPersonFromUserSignup(transformedData)

    if (person) {
      return NextResponse.json({
        success: true,
        message: 'User successfully imported from HomeStack',
        person_id: person.id,
        assigned_to: person.assigned_to
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process user creation' },
      { status: 500 }
    )
  }
}

// Handle user updates from HomeStack
async function handleUserUpdated(userData: any, homeStack: HomeStackIntegration) {
  try {
    // Check if this is actually a new user signup (recent created_at timestamp)
    const createdAt = new Date(userData.created_at)
    const now = new Date()
    const timeDifference = now.getTime() - createdAt.getTime()
    const isRecentSignup = timeDifference < 5 * 60 * 1000 // Within 5 minutes
    
    // If this is a recent signup, treat it as a new user creation
    if (isRecentSignup) {
      
      // Transform the user data to match our expected format
      const transformedUserData = {
        id: userData.guid,
        email: userData.email,
        first_name: userData.name?.split(' ')[0] || userData.email.split('@')[0],
        last_name: userData.name?.split(' ').slice(1).join(' ') || 'Unknown',
        phone: userData.phone,
        created_at: userData.created_at,
        source: 'homestack_mobile', // Mark as mobile signup
        platform: 'homestack_mobile'
      }
      
      // Create the user in our CRM
      const person = await homeStack.createPersonFromUserSignup(transformedUserData)
      
      if (person) {
        return NextResponse.json({
          success: true,
          message: 'New user successfully created from mobile app',
          person_id: person.id
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to create new user from mobile app' },
          { status: 500 }
        )
      }
    } else {
      // This is a genuine update, just log it for now
      
      return NextResponse.json({
        success: true,
        message: 'User update received from HomeStack',
        user_id: userData.guid
      })
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process user update' },
      { status: 500 }
    )
  }
}

// Handle chat messages from HomeStack
async function handleChatMessage(messageData: any, homeStack: HomeStackIntegration) {
  try {
    // For now, just log the message - you can implement chat handling later
    
    return NextResponse.json({
      success: true,
      message: 'Chat message received from HomeStack',
      message_id: messageData.id
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// Handle new lead from HomeStack
async function handleLeadCreated(leadData: any, homeStack: HomeStackIntegration) {
  try {
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
    return NextResponse.json(
      { error: 'Failed to process lead creation' },
      { status: 500 }
    )
  }
}

// Handle new contact from HomeStack
async function handleContactCreated(contactData: any, homeStack: HomeStackIntegration) {
  try {
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
    return NextResponse.json(
      { error: 'Failed to process contact creation' },
      { status: 500 }
    )
  }
} 