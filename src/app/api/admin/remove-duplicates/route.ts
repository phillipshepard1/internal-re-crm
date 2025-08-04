import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DuplicateGroup {
  key: string
  leads: any[]
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = false } = await request.json()

    // Get all staging leads
    const { data: stagingLeads, error } = await supabase
      .from('people')
      .select('*')
      .eq('client_type', 'lead')
      .eq('lead_status', 'staging')
      .is('archived_at', null)
      .order('created_at', { ascending: true }) // Keep the oldest

    if (error) {
      console.error('Error fetching staging leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch staging leads' },
        { status: 500 }
      )
    }

    if (!stagingLeads || stagingLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No staging leads found',
        duplicates: [],
        removed: 0
      })
    }

    // Group leads by exact matching criteria
    const leadGroups = new Map<string, any[]>()

    stagingLeads.forEach(lead => {
      // Create a unique key based on exact matching fields
      const key = [
        lead.first_name?.toLowerCase().trim() || '',
        lead.last_name?.toLowerCase().trim() || '',
        (lead.email?.[0] || '').toLowerCase().trim(),
        (lead.phone?.[0] || '').replace(/\D/g, ''), // Remove non-digits from phone
        lead.lead_source || ''
      ].join('|')

      if (!leadGroups.has(key)) {
        leadGroups.set(key, [])
      }
      leadGroups.get(key)!.push(lead)
    })

    // Find duplicate groups (more than 1 lead with same key)
    const duplicateGroups: DuplicateGroup[] = []
    const leadsToRemove: string[] = []

    leadGroups.forEach((leads, key) => {
      if (leads.length > 1) {
        // Sort by created_at to keep the oldest
        leads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        
        // Keep the first (oldest) lead, mark others for removal
        const toRemove = leads.slice(1)
        leadsToRemove.push(...toRemove.map(lead => lead.id))
        
        duplicateGroups.push({
          key,
          leads: leads.map(lead => ({
            id: lead.id,
            name: `${lead.first_name} ${lead.last_name}`,
            email: lead.email?.[0] || '',
            phone: lead.phone?.[0] || '',
            source: lead.lead_source,
            created_at: lead.created_at,
            toRemove: toRemove.some(r => r.id === lead.id)
          }))
        })
      }
    })

    // If dry run, just return the duplicates found
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `Found ${duplicateGroups.length} groups of duplicates (${leadsToRemove.length} leads to remove)`,
        duplicates: duplicateGroups,
        removed: 0,
        dryRun: true
      })
    }

    // Remove duplicates
    if (leadsToRemove.length > 0) {
      // First delete related records
      // Delete activities
      await supabase
        .from('activities')
        .delete()
        .in('person_id', leadsToRemove)

      // Delete notes
      await supabase
        .from('notes')
        .delete()
        .in('person_id', leadsToRemove)

      // Delete tasks
      await supabase
        .from('tasks')
        .delete()
        .in('person_id', leadsToRemove)

      // Delete follow-ups
      await supabase
        .from('follow_ups')
        .delete()
        .in('person_id', leadsToRemove)

      // Delete files
      await supabase
        .from('files')
        .delete()
        .in('person_id', leadsToRemove)

      // Finally, delete the duplicate leads
      const { error: deleteError } = await supabase
        .from('people')
        .delete()
        .in('id', leadsToRemove)

      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete duplicate leads' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${leadsToRemove.length} duplicate leads from ${duplicateGroups.length} groups`,
      duplicates: duplicateGroups,
      removed: leadsToRemove.length,
      dryRun: false
    })

  } catch (error) {
    console.error('Error in remove duplicates API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}