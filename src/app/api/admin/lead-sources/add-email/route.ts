import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addEmailAsLeadSource } from '@/lib/database'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Add email as lead source
    const result = await addEmailAsLeadSource(email, name)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to add email as lead source' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lead_source: result,
      message: `Email ${email} has been added as a lead source`
    })

  } catch (error) {
    console.error('Error adding email as lead source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 