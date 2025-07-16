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

// GET - Fetch all lead sources
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDefaults = searchParams.get('includeDefaults') === 'true'
    
    let query = supabase
      .from('lead_sources')
      .select('*')
      .order('name')
    
    if (!includeDefaults) {
      query = query.eq('is_default', false)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      lead_sources: data || []
    })
    
  } catch (error) {
    console.error('Error fetching lead sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead sources' },
      { status: 500 }
    )
  }
}

// POST - Create new lead source
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, email_patterns, domain_patterns, keywords } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('lead_sources')
      .insert({
        name,
        description,
        email_patterns: email_patterns || [],
        domain_patterns: domain_patterns || [],
        keywords: keywords || [],
        is_default: false,
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      lead_source: data
    })
    
  } catch (error) {
    console.error('Error creating lead source:', error)
    return NextResponse.json(
      { error: 'Failed to create lead source' },
      { status: 500 }
    )
  }
}

// PUT - Update lead source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, email_patterns, domain_patterns, keywords, is_active } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (email_patterns !== undefined) updateData.email_patterns = email_patterns
    if (domain_patterns !== undefined) updateData.domain_patterns = domain_patterns
    if (keywords !== undefined) updateData.keywords = keywords
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('lead_sources')
      .update(updateData)
      .eq('id', id)
      .eq('is_default', false) // Prevent updating default sources
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      lead_source: data
    })
    
  } catch (error) {
    console.error('Error updating lead source:', error)
    return NextResponse.json(
      { error: 'Failed to update lead source' },
      { status: 500 }
    )
  }
}

// DELETE - Delete lead source
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('lead_sources')
      .delete()
      .eq('id', id)
      .eq('is_default', false) // Prevent deleting default sources
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Lead source deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting lead source:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead source' },
      { status: 500 }
    )
  }
} 