import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get date range parameters
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const apiKey = searchParams.get('api_key')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Build query for pixel-tracked leads - only select columns that exist
    let query = supabase
      .from('people')
      .select('id, created_at, lead_source, lead_status')
      .gte('created_at', startDate.toISOString())
      .like('lead_source', 'pixel_%')
    
    if (apiKey) {
      query = query.eq('pixel_api_key', apiKey)
    }
    
    const { data: pixelLeads, error } = await query
    
    if (error) {
      console.error('Error fetching pixel stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      )
    }
    
    // Calculate statistics
    const stats = {
      total_leads: pixelLeads?.length || 0,
      by_source: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
      by_domain: {} as Record<string, number>,
      daily_counts: {} as Record<string, number>,
      conversion_rate: 0
    }
    
    // Process leads for statistics
    pixelLeads?.forEach(lead => {
      // By source
      const source = lead.lead_source || 'unknown'
      stats.by_source[source] = (stats.by_source[source] || 0) + 1
      
      // By status
      const status = lead.lead_status || 'unassigned'
      stats.by_status[status] = (stats.by_status[status] || 0) + 1
      
      // By domain (from lead_source for now)
      const sourceParts = lead.lead_source?.split('_')
      if (sourceParts && sourceParts.length > 1) {
        const domain = sourceParts.slice(1).join('_')
        if (domain && domain !== 'unknown') {
          stats.by_domain[domain] = (stats.by_domain[domain] || 0) + 1
        }
      }
      
      // Daily counts
      const date = new Date(lead.created_at).toISOString().split('T')[0]
      stats.daily_counts[date] = (stats.daily_counts[date] || 0) + 1
    })
    
    // Calculate conversion rate (assigned leads / total leads)
    const assignedLeads = pixelLeads?.filter(l => l.lead_status === 'assigned').length || 0
    stats.conversion_rate = stats.total_leads > 0 
      ? Math.round((assignedLeads / stats.total_leads) * 100) 
      : 0
    
    // Get recent captures for activity feed - only select columns that exist
    const { data: recentCaptures } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, created_at, lead_source, lead_status')
      .like('lead_source', 'pixel_%')
      .order('created_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      status: 'success',
      stats,
      recent_leads: recentCaptures || [],
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days
      }
    })
    
  } catch (error) {
    console.error('Error in pixel stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}