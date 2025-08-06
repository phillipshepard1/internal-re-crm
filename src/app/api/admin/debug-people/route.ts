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
      .select('id, first_name, last_name, email, client_type, lead_status, lead_source, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by different criteria
    const regularPeople = allPeople?.filter(p => p.client_type !== 'lead') || []
    const allLeads = allPeople?.filter(p => p.client_type === 'lead') || []
    const convertedLeads = allLeads.filter(p => p.lead_status === 'converted')
    const importedLeads = allLeads.filter(p => p.lead_source === 'csv_import')

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
      convertedLeads: {
        count: convertedLeads.length,
        data: convertedLeads
      },
      importedLeads: {
        count: importedLeads.length,
        data: importedLeads
      },
      summary: {
        'People tab should show': regularPeople.length,
        'Converted Leads tab should show': convertedLeads.length,
        'Imported Leads tab should show': importedLeads.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 