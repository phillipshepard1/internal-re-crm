import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all people with their key fields
    const { data: allPeople, error } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, client_type, lead_status, lead_source, pixel_source_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by different criteria
    const regularPeople = allPeople?.filter(p => p.client_type !== 'lead') || []
    const allLeads = allPeople?.filter(p => p.client_type === 'lead') || []
    const convertedLeads = allLeads.filter(p => p.lead_status === 'converted')
    const importedLeads = allLeads.filter(p => p.lead_source === 'csv_import')
    const pixelLeads = allPeople?.filter(p => p.lead_source?.startsWith('pixel_')) || []
    const stagingLeads = allLeads.filter(p => p.lead_status === 'staging')
    const unassignedLeads = allLeads.filter(p => p.lead_status === 'unassigned')

    return NextResponse.json({
      total: allPeople?.length || 0,
      regularPeople: {
        count: regularPeople.length,
        data: regularPeople
      },
      allLeads: {
        count: allLeads.length,
        data: allLeads
      },
      pixelLeads: {
        count: pixelLeads.length,
        data: pixelLeads,
        sources: [...new Set(pixelLeads.map(p => p.pixel_source_url).filter(Boolean))]
      },
      stagingLeads: {
        count: stagingLeads.length,
        data: stagingLeads
      },
      unassignedLeads: {
        count: unassignedLeads.length,
        data: unassignedLeads
      },
      convertedLeads: {
        count: convertedLeads.length,
        data: convertedLeads
      },
      importedLeads: {
        count: importedLeads.length,
        data: importedLeads
      },
      summary: {
        'Total People': allPeople?.length || 0,
        'Leads in Staging': stagingLeads.length,
        'Unassigned Leads': unassignedLeads.length,
        'Pixel Leads': pixelLeads.length,
        'People tab should show': regularPeople.length,
        'Converted Leads tab should show': convertedLeads.length,
        'Imported Leads tab should show': importedLeads.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 