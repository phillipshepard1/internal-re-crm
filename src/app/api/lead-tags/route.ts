import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all lead tags
export async function GET(request: NextRequest) {
  try {
    const { data: tags, error } = await supabase
      .from('lead_tags')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(tags)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// POST - Create a new lead tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, is_active = true } = body

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      )
    }

    // Check if tag with the same name already exists
    const { data: existingTag, error: checkError } = await supabase
      .from('lead_tags')
      .select('id')
      .eq('name', name)
      .single()

    if (existingTag) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    // Create the new tag using service role key (bypasses RLS)
    const { data, error } = await supabase
      .from('lead_tags')
      .insert([{
        name,
        description: description || null,
        color,
        is_active
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create tag', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a lead tag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('id')

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // First, remove all associations with this tag from person_lead_tags
    const { error: unlinkError } = await supabase
      .from('person_lead_tags')
      .delete()
      .eq('lead_tag_id', tagId)

    if (unlinkError) {
      console.error('Error unlinking tag from people:', unlinkError)
    }

    // Also update people table to remove this tag from lead_tag_id column
    const { error: updateError } = await supabase
      .from('people')
      .update({ lead_tag_id: null })
      .eq('lead_tag_id', tagId)

    if (updateError) {
      console.error('Error updating people table:', updateError)
    }

    // Now delete the tag itself
    const { error } = await supabase
      .from('lead_tags')
      .delete()
      .eq('id', tagId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete tag', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}

// PATCH - Update a lead tag
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, color, is_active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (color !== undefined) updates.color = color
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('lead_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update tag', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}