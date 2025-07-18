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
    
    // ADDED: Detailed debug logging
    console.log('🔍 HomeStack Webhook Debug - Full Request:')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Body:', JSON.stringify(body, null, 2))
    console.log('Signature:', signature)
    console.log('Timestamp:', new Date().toISOString())
    
    console.log('HomeStack webhook received:', {
      type: body.type,
      timestamp: new Date().toISOString(),
      payload: body
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
        console.log('Legacy events: user.created, lead.created, contact.created')
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
    console.log('🔄 Processing new user from HomeStack:', userData)
    console.log('📊 User data structure:', {
      hasId: !!userData.id,
      hasEmail: !!userData.email,
      hasFirstName: !!userData.first_name,
      hasLastName: !!userData.last_name,
      hasPhone: !!userData.phone,
      hasCreatedAt: !!userData.created_at,
      dataKeys: Object.keys(userData)
    })

    // Use the new method for user signup handling
    const person = await homeStack.createPersonFromUserSignup(userData)

    if (person) {
      console.log('✅ User successfully created in CRM:', {
        personId: person.id,
        assignedTo: person.assigned_to,
        email: person.email,
        name: `${person.first_name} ${person.last_name}`
      })
      
      return NextResponse.json({
        success: true,
        message: 'User successfully imported from HomeStack',
        person_id: person.id,
        assigned_to: person.assigned_to
      })
    } else {
      console.log('❌ Failed to create user in CRM')
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