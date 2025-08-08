import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'pk_'
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix + randomPart
}

// GET: Fetch all API keys
export async function GET(request: NextRequest) {
  try {
    // Fetch all API keys
    const { data: apiKeys, error } = await supabase
      .from('pixel_api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ 
          success: true, 
          apiKeys: [],
          message: 'Pixel API keys table not yet created. Please run database migrations.'
        })
      }
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      apiKeys: apiKeys || [] 
    })

  } catch (error) {
    console.error('Error in GET /api/pixel/keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, website } = body

    if (!name || !website) {
      return NextResponse.json({ 
        error: 'Name and website are required' 
      }, { status: 400 })
    }

    // Generate new API key
    const apiKey = generateApiKey()

    // Create the API key in database
    const { data: newKey, error } = await supabase
      .from('pixel_api_keys')
      .insert({
        key: apiKey,
        name,
        website,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      // If table doesn't exist, provide helpful message
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Pixel API keys table not yet created. Please run database migrations.' 
        }, { status: 500 })
      }
      return NextResponse.json({ 
        error: 'Failed to create API key' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      apiKey: newKey 
    })

  } catch (error) {
    console.error('Error in POST /api/pixel/keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ 
        error: 'API key ID is required' 
      }, { status: 400 })
    }

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from('pixel_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)

    if (error) {
      console.error('Error deleting API key:', error)
      return NextResponse.json({ 
        error: 'Failed to delete API key' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/pixel/keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}