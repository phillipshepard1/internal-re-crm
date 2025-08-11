import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // First, get all pixel leads with 'unassigned' status
    const { data: unassignedPixelLeads, error: fetchError } = await supabase
      .from('people')
      .select('id, first_name, last_name, lead_status, lead_source')
      .eq('client_type', 'lead')
      .eq('lead_status', 'unassigned')
      .like('lead_source', 'pixel_%')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Update them to 'staging' status
    if (unassignedPixelLeads && unassignedPixelLeads.length > 0) {
      const { error: updateError } = await supabase
        .from('people')
        .update({ lead_status: 'staging' })
        .eq('client_type', 'lead')
        .eq('lead_status', 'unassigned')
        .like('lead_source', 'pixel_%')

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${unassignedPixelLeads.length} pixel leads`,
        fixed_leads: unassignedPixelLeads
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No unassigned pixel leads found',
      fixed_leads: []
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint can also check API keys and pixel setup
    const { data: apiKeys, error: keysError } = await supabase
      .from('pixel_api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (keysError) {
      // Table might not exist
      return NextResponse.json({ 
        error: 'API keys table not found. Run database migrations.',
        details: keysError.message 
      }, { status: 500 })
    }

    // Get recent pixel captures
    const { data: pixelCaptures, error: capturesError } = await supabase
      .from('pixel_captures')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(10)

    // Get all pixel leads regardless of status
    const { data: allPixelLeads, error: leadsError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, lead_status, lead_source, pixel_source_url, created_at')
      .like('lead_source', 'pixel_%')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      api_keys: {
        count: apiKeys?.length || 0,
        data: apiKeys || []
      },
      pixel_captures: {
        count: pixelCaptures?.length || 0,
        data: pixelCaptures || []
      },
      pixel_leads: {
        total: allPixelLeads?.length || 0,
        by_status: {
          staging: allPixelLeads?.filter(l => l.lead_status === 'staging').length || 0,
          unassigned: allPixelLeads?.filter(l => l.lead_status === 'unassigned').length || 0,
          assigned: allPixelLeads?.filter(l => l.lead_status === 'assigned').length || 0,
          other: allPixelLeads?.filter(l => !['staging', 'unassigned', 'assigned'].includes(l.lead_status || '')).length || 0
        },
        recent: allPixelLeads?.slice(0, 10) || []
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}