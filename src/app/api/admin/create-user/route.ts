import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, role, firstName, lastName } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['agent', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "agent" or "admin"' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users?.some(user => user.email === email)
    if (userExists) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        firstName: firstName || '',
        lastName: lastName || '',
        role: role
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Insert user record into users table
    console.log('Attempting to insert user into users table:', {
      id: authData.user.id,
      email: email,
      role: role,
      first_name: firstName || null,
      last_name: lastName || null,
      created_at: new Date().toISOString()
    })

    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        role: role,
        first_name: firstName || null,
        last_name: lastName || null,
        created_at: new Date().toISOString()
      })
      .select()

    if (userError) {
      console.error('User table insert error:', userError)
      console.error('Error details:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      })
      // Try to clean up the auth user if table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + userError.message },
        { status: 500 }
      )
    }

    console.log('User successfully inserted into users table:', insertedUser)

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email: email,
      role: role,
      message: 'User created successfully'
    })

  } catch (err: unknown) {
    console.error('Create user error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 