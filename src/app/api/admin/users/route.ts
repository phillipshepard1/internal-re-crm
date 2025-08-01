import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    
    // Build query
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Filter out archived users unless explicitly requested
    if (!includeArchived) {
      query = query.eq('status', 'active')
    }
    
    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get round robin config
    const { data: roundRobinConfig, error: rrError } = await supabase
      .from('round_robin_config')
      .select('*')
      .order('priority', { ascending: true })

    if (rrError) {
      console.error('Error fetching round robin config:', rrError)
      // Don't fail the whole request if round robin fails
    }

    return NextResponse.json({
      users: users || [],
      roundRobinConfig: roundRobinConfig || []
    })

  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, action, archivedBy } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      )
    }

    // First, check if the user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role, status')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (action === 'archive') {
      // Prevent archiving of the last admin user
      if (existingUser.role === 'admin') {
        const { data: activeAdminUsers, error: adminCountError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('status', 'active')

        if (adminCountError) {
          console.error('Error counting active admin users:', adminCountError)
          return NextResponse.json(
            { error: 'Failed to verify admin user count' },
            { status: 500 }
          )
        }

        if (activeAdminUsers && activeAdminUsers.length <= 1) {
          return NextResponse.json(
            { error: 'Cannot archive the last admin user' },
            { status: 400 }
          )
        }
      }

      // Archive the user
      const { error: archiveError } = await supabase
        .from('users')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: archivedBy || null
        })
        .eq('id', userId)

      if (archiveError) {
        console.error('Error archiving user:', archiveError)
        return NextResponse.json(
          { error: 'Failed to archive user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `User ${existingUser.email} has been archived successfully`
      })

    } else if (action === 'restore') {
      // Restore the user
      const { error: restoreError } = await supabase
        .from('users')
        .update({
          status: 'active',
          archived_at: null,
          archived_by: null
        })
        .eq('id', userId)

      if (restoreError) {
        console.error('Error restoring user:', restoreError)
        return NextResponse.json(
          { error: 'Failed to restore user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `User ${existingUser.email} has been restored successfully`
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "archive" or "restore"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in user archive/restore API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 