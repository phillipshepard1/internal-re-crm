import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

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

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // First, check if the user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of the last admin user
    if (existingUser.role === 'admin') {
      const { data: adminUsers, error: adminCountError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (adminCountError) {
        console.error('Error counting admin users:', adminCountError)
        return NextResponse.json(
          { error: 'Failed to verify admin user count' },
          { status: 500 }
        )
      }

      if (adminUsers && adminUsers.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        )
      }
    }

    // Delete the user from the users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Also delete the user from Supabase Auth (if they have an auth account)
    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)
      if (authDeleteError) {
        console.warn('Warning: Could not delete user from auth:', authDeleteError)
        // Don't fail the request if auth deletion fails, as the user might not have an auth account
      }
    } catch (authError) {
      console.warn('Warning: Could not delete user from auth:', authError)
      // Continue with the deletion even if auth deletion fails
    }

    return NextResponse.json({
      success: true,
      message: `User ${existingUser.email} has been deleted successfully`
    })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 