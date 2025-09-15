import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CustomLeadTab } from '@/lib/supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Fetch all custom tabs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('tab_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching custom tabs:', error)
      return NextResponse.json({ error: 'Failed to fetch custom tabs' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/custom-tabs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new custom tab
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, filter_type, filter_value, color, tab_order } = body

    // Validate required fields
    if (!name || !filter_type || !filter_value) {
      return NextResponse.json(
        { error: 'Name, filter_type, and filter_value are required' },
        { status: 400 }
      )
    }

    // Validate filter_type
    if (!['tag', 'status', 'source', 'custom'].includes(filter_type)) {
      return NextResponse.json(
        { error: 'Invalid filter_type' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .insert({
        user_id: user.id,
        name,
        filter_type,
        filter_value,
        color: color || '#3B82F6',
        tab_order: tab_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A tab with this name already exists' },
          { status: 400 }
        )
      }
      console.error('Error creating custom tab:', error)
      return NextResponse.json({ error: 'Failed to create custom tab' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/custom-tabs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update an existing custom tab
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, filter_type, filter_value, color, tab_order } = body

    if (!id) {
      return NextResponse.json({ error: 'Tab ID is required' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Partial<CustomLeadTab> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (filter_type !== undefined) updateData.filter_type = filter_type
    if (filter_value !== undefined) updateData.filter_value = filter_value
    if (color !== undefined) updateData.color = color
    if (tab_order !== undefined) updateData.tab_order = tab_order

    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A tab with this name already exists' },
          { status: 400 }
        )
      }
      console.error('Error updating custom tab:', error)
      return NextResponse.json({ error: 'Failed to update custom tab' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Tab not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/custom-tabs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Soft delete a custom tab
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Tab ID is required' }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('custom_lead_tabs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting custom tab:', error)
      return NextResponse.json({ error: 'Failed to delete custom tab' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Tab not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Tab deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/custom-tabs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}