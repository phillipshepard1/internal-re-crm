import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET - Fetch HomeStack configuration
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('integration_type', 'homestack')
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }
    
    return NextResponse.json({
      success: true,
      config: data || {
        api_key: '',
        base_url: 'https://api.homestack.com',
        webhook_secret: '',
        enabled: false
      }
    })
    
  } catch (error) {
    console.error('Error fetching HomeStack config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HomeStack configuration' },
      { status: 500 }
    )
  }
}

// POST - Save HomeStack configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      apiKey, 
      baseUrl, 
      webhookSecret, 
      enabled,
      // SSO configuration
      ssoEnabled,
      ssoApiKey,
      ssoBaseUrl,
      ssoBrokerUrl
    } = body
    
    console.log('🔧 Saving HomeStack config:', {
      apiKey: apiKey ? '***' : 'MISSING',
      baseUrl,
      enabled,
      ssoEnabled,
      ssoApiKey: ssoApiKey ? '***' : 'MISSING',
      ssoBaseUrl,
      ssoBrokerUrl
    })
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      )
    }
    
    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('integration_type', 'homestack')
      .single()
    
    const configData = {
      integration_type: 'homestack',
      api_key: apiKey,
      base_url: baseUrl || 'https://api.homestack.com',
      webhook_secret: webhookSecret || null,
      enabled: enabled || false,
      // SSO configuration
      sso_enabled: ssoEnabled || false,
      sso_api_key: ssoApiKey || null,
      sso_base_url: ssoBaseUrl || 'https://bkapi.homestack.com',
      sso_broker_url: ssoBrokerUrl || 'https://broker.homestack.com',
      updated_at: new Date().toISOString()
    }
    
    let result
    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from('integration_configs')
        .update(configData)
        .eq('integration_type', 'homestack')
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('integration_configs')
        .insert({
          ...configData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    console.log('✅ HomeStack config saved successfully:', {
      id: result.id,
      sso_enabled: result.sso_enabled,
      sso_api_key: result.sso_api_key ? '***' : 'MISSING'
    })
    
    return NextResponse.json({
      success: true,
      config: result
    })
    
  } catch (error) {
    console.error('Error saving HomeStack config:', error)
    return NextResponse.json(
      { error: 'Failed to save HomeStack configuration' },
      { status: 500 }
    )
  }
}

// DELETE - Remove HomeStack configuration
export async function DELETE() {
  try {
    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('integration_type', 'homestack')
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'HomeStack configuration removed successfully'
    })
    
  } catch (error) {
    console.error('Error removing HomeStack config:', error)
    return NextResponse.json(
      { error: 'Failed to remove HomeStack configuration' },
      { status: 500 }
    )
  }
} 