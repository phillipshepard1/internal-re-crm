import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Call the database function to create pending follow-ups
    const { data, error } = await supabase.rpc('create_pending_followups')
    
    if (error) {
      console.error('Error creating pending follow-ups:', error)
      return NextResponse.json(
        { error: 'Failed to create pending follow-ups' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Created ${data} new follow-ups`,
      followups_created: data
    })

  } catch (error) {
    console.error('Error in create follow-ups API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 