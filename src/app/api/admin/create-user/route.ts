import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role, inRoundRobin, firstName, lastName } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: `Auth error: ${authError.message}` 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'Failed to create user in auth' 
      }, { status: 500 })
    }

    // Step 2: Create user record in our users table
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        role: role || 'agent',
        in_round_robin: inRoundRobin || false
      }])
      .select()
      .single()

    if (userError) {
      console.error('User record error:', userError)
      // Try to clean up the auth user if user record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ 
        error: `User record error: ${userError.message}` 
      }, { status: 500 })
    }

    // Step 3: Add to Round Robin if enabled
    if (inRoundRobin) {
      const { error: roundRobinError } = await supabaseAdmin
        .from('round_robin_config')
        .insert([{ 
          user_id: authData.user.id, 
          is_active: true, 
          priority: 0 
        }])

      if (roundRobinError) {
        console.error('Round Robin error:', roundRobinError)
        // Don't fail the whole operation for Round Robin errors
      }
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: authData.user.id,
        email: email,
        role: role || 'agent',
        in_round_robin: inRoundRobin || false
      },
      message: 'User created successfully'
    })

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error.message 
    }, { status: 500 })
  }
} 