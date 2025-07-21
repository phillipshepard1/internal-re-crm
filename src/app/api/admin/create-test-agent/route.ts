import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Create a test agent user
    const testAgentData = {
      id: 'test-agent-' + Date.now(),
      email: 'test-agent@example.com',
      role: 'agent',
      first_name: 'Test',
      last_name: 'Agent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('users')
      .insert([testAgentData])
      .select()
      .single()

    if (error) {
      console.error('Error creating test agent:', error)
      return NextResponse.json(
        { error: 'Failed to create test agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test agent created successfully',
      agent: data
    })

  } catch (err) {
    console.error('Error creating test agent:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 