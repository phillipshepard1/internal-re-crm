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

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Get existing webhooks
    const webhooks = await homeStack.getWebhooks()
    
    const webhookUrl = 'https://app.stresslesscrm.com/api/webhooks/homestack'
    const ourWebhook = webhooks.find(webhook => webhook.url === webhookUrl)

    return NextResponse.json({
      success: true,
      webhooks,
      ourWebhook,
      webhookUrl,
      isRegistered: !!ourWebhook
    })

  } catch (error) {
    console.error('❌ Error managing webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, webhookGuid } = body

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

    // Use the correct webhook URL - hardcode the production URL since we know it works
    const webhookUrl = 'https://app.stresslesscrm.com/api/webhooks/homestack'
    
    console.log('🔗 Using webhook URL:', webhookUrl)
    console.log('🔗 HomeStack config:', {
      baseUrl: homeStackConfig.baseUrl,
      apiKey: homeStackConfig.apiKey ? '***' : 'MISSING',
      webhookSecret: homeStackConfig.webhookSecret ? '***' : 'MISSING'
    })

    switch (action) {
      case 'register':
        console.log('🔗 Registering webhook with HomeStack...')
        try {
          const result = await homeStack.ensureWebhookRegistered(webhookUrl)
          console.log('🔗 Registration result:', result)
          
          if (result.success) {
            return NextResponse.json({
              success: true,
              message: result.message,
              webhookGuid: result.webhookGuid
            })
          } else {
            return NextResponse.json(
              { error: result.message },
              { status: 500 }
            )
          }
        } catch (registerError) {
          console.error('❌ Registration error:', registerError)
          return NextResponse.json(
            { error: `Registration failed: ${registerError instanceof Error ? registerError.message : 'Unknown error'}` },
            { status: 500 }
          )
        }

      case 'delete':
        if (!webhookGuid) {
          return NextResponse.json(
            { error: 'Webhook GUID is required for deletion' },
            { status: 400 }
          )
        }
        
        const deleted = await homeStack.deleteWebhook(webhookGuid)
        
        if (deleted) {
          return NextResponse.json({
            success: true,
            message: 'Webhook deleted successfully'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to delete webhook' },
            { status: 500 }
          )
        }

      case 'update':
        if (!webhookGuid) {
          return NextResponse.json(
            { error: 'Webhook GUID is required for update' },
            { status: 400 }
          )
        }
        
        const updated = await homeStack.updateWebhook(webhookGuid, webhookUrl)
        
        if (updated) {
          return NextResponse.json({
            success: true,
            message: 'Webhook updated successfully'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to update webhook' },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: register, delete, or update' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Error managing webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 