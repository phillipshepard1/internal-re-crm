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
    const { eventType = 'user.created', testData } = body

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

    // Simulate different webhook events
    switch (eventType) {
      case 'user.created':
        const userData = testData || {
          id: `test_user_${Date.now()}`,
          email: `testuser${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'User',
          phone: '+1234567890',
          created_at: new Date().toISOString()
        }
        
        const person = await homeStack.createPersonFromUserSignup(userData)
        
        if (person) {
          return NextResponse.json({
            success: true,
            message: 'Test user created successfully',
            person_id: person.id,
            assigned_to: person.assigned_to,
            test_data: userData
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to create test user' },
            { status: 500 }
          )
        }

      case 'lead.created':
        const leadData = testData || {
          id: `test_lead_${Date.now()}`,
          first_name: 'Test',
          last_name: 'Lead',
          email: [`testlead${Date.now()}@example.com`],
          phone: ['+1234567890'],
          message: 'Test lead from HomeStack',
          property_address: '123 Test St, Test City, TS 12345',
          property_details: '3 bed, 2 bath house',
          created_at: new Date().toISOString()
        }
        
        const lead = homeStack.transformLeads([leadData])[0]
        const leadPerson = await homeStack.createPersonFromLead(lead)
        
        if (leadPerson) {
          return NextResponse.json({
            success: true,
            message: 'Test lead created successfully',
            person_id: leadPerson.id,
            assigned_to: leadPerson.assigned_to,
            test_data: leadData
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to create test lead' },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${eventType}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 