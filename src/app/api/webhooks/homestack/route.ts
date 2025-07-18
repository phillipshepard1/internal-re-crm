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
      console.error('HomeStack integration not configured')
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
      case 'user.created':
      case 'user.registered':
        return await handleUserCreated(body.data, homeStack)
      
      case 'lead.created':
      case 'lead.updated':
        return await handleLeadCreated(body.data, homeStack)
      
      case 'contact.created':
      case 'contact.updated':
        return await handleContactCreated(body.data, homeStack)
      
      default:
        console.log('Unhandled webhook event:', body.type)
        return NextResponse.json({ success: true, message: 'Event ignored' })
    }

  } catch (error) {
    console.error('HomeStack webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle new user signup from HomeStack
async function handleUserCreated(userData: any, homeStack: HomeStackIntegration) {
  try {
    console.log('Processing new user from HomeStack:', userData)

    // Use the new method for user signup handling
    const person = await homeStack.createPersonFromUserSignup(userData)

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
    console.error('Error handling user creation:', error)
    return NextResponse.json(
      { error: 'Failed to process user creation' },
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