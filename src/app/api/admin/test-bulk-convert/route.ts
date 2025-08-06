import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { personIds, userId } = await request.json()

    if (!personIds || !Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json({ error: 'Invalid personIds array' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Test the bulk conversion
    const { data, error } = await supabase
      .from('people')
      .update({
        client_type: 'lead',
        lead_status: 'converted',
        lead_source: 'csv_import',
        assigned_to: userId,
        updated_at: new Date().toISOString()
      })
      .in('id', personIds)
      .select('id, first_name, last_name, client_type, lead_status, lead_source')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      convertedCount: data?.length || 0,
      convertedPeople: data
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 