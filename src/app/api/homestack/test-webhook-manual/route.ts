import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType = 'web' } = body

    // Simulate HomeStack webhook payload
    let webhookPayload: any = {}
    let headers: any = {}

    if (testType === 'web') {
      webhookPayload = {
        event: 'user.created',
        data: {
          guid: `test_web_${Date.now()}`,
          email: `testweb${Date.now()}@example.com`,
          name: 'Test Web User',
          phone: '+1234567890',
          created_at: new Date().toISOString(),
          source: 'homestack'
        }
      }
    } else if (testType === 'mobile') {
      webhookPayload = {
        event: 'mobile.user.created',
        data: {
          guid: `test_mobile_${Date.now()}`,
          email: `testmobile${Date.now()}@example.com`,
          name: 'Test Mobile User',
          phone: '+1234567890',
          created_at: new Date().toISOString(),
          source: 'homestack_mobile',
          device_info: 'Mobile App'
        }
      }
    }

    // Add a fake signature header
    headers['x-homestack-signature'] = 'test-signature'

    console.log('🧪 Testing webhook with payload:', webhookPayload)

    // Call the actual webhook endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/homestack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-homestack-signature': 'test-signature'
      },
      body: JSON.stringify(webhookPayload)
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      test_type: testType,
      webhook_payload: webhookPayload,
      webhook_response: result,
      status: response.status
    })

  } catch (error) {
    console.error('❌ Error testing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 