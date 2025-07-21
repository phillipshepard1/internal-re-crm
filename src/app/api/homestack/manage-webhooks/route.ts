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
      baseUrl: configData.base_url || 'https://api.homestack.com',
      webhookSecret: configData.webhook_secret,
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    // Get existing webhooks
    const webhooks = await homeStack.getWebhooks()
    
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/homestack`
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
      baseUrl: configData.base_url || 'https://api.homestack.com',
      webhookSecret: configData.webhook_secret,
    }

    // Initialize HomeStack integration
    const homeStack = new HomeStackIntegration(homeStackConfig)

    const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/homestack`

    switch (action) {
      case 'register':
        console.log('🔗 Registering webhook with HomeStack...')
        const result = await homeStack.ensureWebhookRegistered(webhookUrl)
        
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