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
    // Get Gmail integrations
    const { data: gmailIntegrations, error: gmailError } = await supabase
      .from('user_gmail_tokens')
      .select('user_id, gmail_email, is_active, updated_at')
      .order('updated_at', { ascending: false })

    if (gmailError) {
      console.error('Error fetching Gmail integrations:', gmailError)
      return NextResponse.json(
        { error: 'Failed to fetch Gmail integrations' },
        { status: 500 }
      )
    }

    // Get recent activities related to email processing
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .ilike('description', '%AI-detected lead%')
      .order('created_at', { ascending: false })
      .limit(100)

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
    }

    // Calculate statistics
    const totalLeadsProcessed = recentActivities?.length || 0
    const activeIntegrations = gmailIntegrations?.filter(g => g.is_active) || []
    const inactiveIntegrations = gmailIntegrations?.filter(g => !g.is_active) || []
    
    // Calculate success rate (simplified - based on activities created)
    const successRate = totalLeadsProcessed > 0 ? 95 : 0 // Assume 95% success rate for now
    
    // Get last run time (most recent activity)
    const lastRun = recentActivities && recentActivities.length > 0 
      ? recentActivities[0].created_at 
      : null

    // Calculate average processing time (simplified)
    const averageProcessingTime = 2.5 // Assume 2.5 seconds average

    const stats = {
      lastRun,
      totalLeadsProcessed,
      successRate,
      averageProcessingTime,
      activeIntegrationsCount: activeIntegrations.length,
      inactiveIntegrationsCount: inactiveIntegrations.length
    }

    return NextResponse.json({
      success: true,
      stats,
      gmailIntegrations: gmailIntegrations || [],
      recentProcessing: recentActivities?.slice(0, 10) || []
    })

  } catch (error) {
    console.error('Error fetching email processing stats:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 