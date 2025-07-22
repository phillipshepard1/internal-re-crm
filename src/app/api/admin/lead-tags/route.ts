import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: leadTags, error } = await supabase
      .from('lead_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching lead tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch lead tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leadTags: leadTags || []
    })

  } catch (error) {
    console.error('Error in lead tags API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const { data: leadTag, error } = await supabase
      .from('lead_tags')
      .insert([{
        name,
        color: color || '#6B7280',
        description: description || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead tag:', error)
      return NextResponse.json(
        { error: 'Failed to create lead tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      leadTag
    })

  } catch (error) {
    console.error('Error in lead tags API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 