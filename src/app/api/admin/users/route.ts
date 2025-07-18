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