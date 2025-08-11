import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // First, get ALL pixel leads regardless of status to see the full picture
    const { data: allPixelLeads, error: allFetchError } = await supabase
      .from('people')
      .select('id, first_name, last_name, lead_status, lead_source, created_at, pixel_source_url')
      .eq('client_type', 'lead')
      .like('lead_source', 'pixel_%')
      .order('created_at', { ascending: false })

    if (allFetchError) {
      return NextResponse.json({ error: allFetchError.message }, { status: 500 })
    }

    // Count by status BEFORE fix
    const beforeCounts = {
      total: allPixelLeads?.length || 0,
      staging: allPixelLeads?.filter(l => l.lead_status === 'staging').length || 0,
      unassigned: allPixelLeads?.filter(l => l.lead_status === 'unassigned').length || 0,
      assigned: allPixelLeads?.filter(l => l.lead_status === 'assigned').length || 0,
      other: allPixelLeads?.filter(l => !['staging', 'unassigned', 'assigned'].includes(l.lead_status || '')).length || 0
    }

    // Get unassigned pixel leads that need fixing
    const unassignedPixelLeads = allPixelLeads?.filter(l => l.lead_status === 'unassigned') || []

    // Update ALL unassigned pixel leads to 'staging' status
    if (unassignedPixelLeads.length > 0) {
      const { error: updateError } = await supabase
        .from('people')
        .update({ 
          lead_status: 'staging',
          updated_at: new Date().toISOString()
        })
        .eq('client_type', 'lead')
        .eq('lead_status', 'unassigned')
        .like('lead_source', 'pixel_%')

      if (updateError) {
        return NextResponse.json({ 
          error: 'Failed to update leads',
          details: updateError.message,
          before_counts: beforeCounts,
          unassigned_leads: unassignedPixelLeads
        }, { status: 500 })
      }

      // Verify the fix by fetching again
      const { data: afterPixelLeads, error: afterFetchError } = await supabase
        .from('people')
        .select('id, first_name, last_name, lead_status, lead_source')
        .eq('client_type', 'lead')
        .like('lead_source', 'pixel_%')

      const afterCounts = {
        total: afterPixelLeads?.length || 0,
        staging: afterPixelLeads?.filter(l => l.lead_status === 'staging').length || 0,
        unassigned: afterPixelLeads?.filter(l => l.lead_status === 'unassigned').length || 0,
        assigned: afterPixelLeads?.filter(l => l.lead_status === 'assigned').length || 0,
        other: afterPixelLeads?.filter(l => !['staging', 'unassigned', 'assigned'].includes(l.lead_status || '')).length || 0
      }

      return NextResponse.json({
        success: true,
        message: `Successfully moved ${unassignedPixelLeads.length} pixel leads from 'unassigned' to 'staging'`,
        before_counts: beforeCounts,
        after_counts: afterCounts,
        fixed_leads: unassignedPixelLeads.map(l => ({
          id: l.id,
          name: `${l.first_name} ${l.last_name}`,
          source: l.pixel_source_url || l.lead_source,
          created: l.created_at
        }))
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No unassigned pixel leads found - all pixel leads are already in staging or assigned',
      counts: beforeCounts,
      all_pixel_leads: allPixelLeads?.slice(0, 10) // Show first 10 for verification
    })

  } catch (error) {
    console.error('Error in fix-pixel-leads:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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