import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check if users table exists by trying to query it
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      return NextResponse.json({
        tableExists: false,
        error: usersError.message,
        code: usersError.code
      })
    }

    // Get table structure
    let tableInfo = null
    try {
      const { data: tableInfoData } = await supabase
        .rpc('get_table_info', { table_name: 'users' })
      tableInfo = tableInfoData
    } catch (error) {
      tableInfo = 'Table info not available'
    }

    return NextResponse.json({
      tableExists: true,
      userCount: users?.length || 0,
      users: users || [],
      tableInfo: tableInfo || 'Table info not available'
    })

  } catch (error) {
    console.error('Error checking users table:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 