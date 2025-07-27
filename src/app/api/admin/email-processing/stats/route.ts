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

export async function GET(request: NextRequest) {
  try {
    // Get total processed emails
    const { data: totalProcessed, error: totalError } = await supabase
      .from('processed_emails')
      .select('id', { count: 'exact' })

    if (totalError) throw totalError

    // Get leads created (emails that resulted in a person)
    const { data: leadsCreated, error: leadsError } = await supabase
      .from('processed_emails')
      .select('id', { count: 'exact' })
      .not('person_id', 'is', null)

    if (leadsError) throw leadsError

    // Get failed processing (emails that didn't result in a person)
    const { data: failedProcessing, error: failedError } = await supabase
      .from('processed_emails')
      .select('id', { count: 'exact' })
      .is('person_id', null)

    if (failedError) throw failedError

    // Calculate success rate
    const total = totalProcessed?.length || 0
    const leads = leadsCreated?.length || 0
    const failed = failedProcessing?.length || 0
    const successRate = total > 0 ? (leads / total) * 100 : 0

    // Get last 24 hours stats
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const { data: last24Hours, error: last24Error } = await supabase
      .from('processed_emails')
      .select('id, person_id, processed_at')

    if (last24Error) throw last24Error

    const last24Processed = last24Hours?.filter(e => new Date(e.processed_at) > twentyFourHoursAgo) || []
    const last24Leads = last24Processed.filter(e => e.person_id).length
    const last24Failed = last24Processed.filter(e => !e.person_id).length

    // Get lead sources performance
    const { data: leadSourceStats, error: leadSourceError } = await supabase
      .from('people')
      .select('lead_source, lead_source_id')
      .not('lead_source', 'is', null)

    if (leadSourceError) throw leadSourceError

    // Group by lead source
    const leadSourceCounts: Record<string, number> = {}
    leadSourceStats?.forEach(person => {
      const source = person.lead_source || 'Unknown'
      leadSourceCounts[source] = (leadSourceCounts[source] || 0) + 1
    })

    const leadSources = Object.entries(leadSourceCounts).map(([name, count]) => ({
      name,
      count,
      success_rate: 85 + Math.random() * 15 // Mock success rate for now
    }))

    // Get recent activity
    const { data: recentActivity, error: recentError } = await supabase
      .from('processed_emails')
      .select(`
        id,
        email_id,
        person_id,
        processed_at,
        gmail_email,
        people(
          first_name,
          last_name,
          lead_source
        )
      `)
      .order('processed_at', { ascending: false })
      .limit(20)

    if (recentError) throw recentError

    const recentActivityFormatted = recentActivity?.map(activity => ({
      id: activity.id,
      email_from: activity.gmail_email || 'Unknown',
      lead_name: activity.people && activity.people.length > 0 ? 
        `${activity.people[0].first_name} ${activity.people[0].last_name}` : '',
      lead_source: activity.people && activity.people.length > 0 ? 
        activity.people[0].lead_source || 'Unknown' : 'Unknown',
      confidence: 0.7 + Math.random() * 0.3, // Mock confidence score
      processed_at: activity.processed_at,
      status: activity.person_id ? 'success' : 'failed' as const
    })) || []

    const stats = {
      total_processed: total,
      leads_created: leads,
      failed_processing: failed,
      success_rate: successRate,
      last_24_hours: {
        processed: last24Processed.length,
        leads: last24Leads,
        failed: last24Failed
      },
      lead_sources: leadSources,
      recent_activity: recentActivityFormatted
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error fetching email processing stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email processing statistics' },
      { status: 500 }
    )
  }
} 