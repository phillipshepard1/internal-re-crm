import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Define the missing users based on what was shown in the User Management page
    const missingUsers = [
      {
        id: 'user-harsh-' + Date.now(),
        email: 'harsh@gmail.com',
        role: 'agent',
        first_name: 'Harsh',
        last_name: '',
        created_at: new Date('2025-07-18').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-justin-' + Date.now(),
        email: 'justin@gmail.com',
        role: 'agent',
        first_name: 'Justin',
        last_name: '',
        created_at: new Date('2025-07-18').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-phillip-' + Date.now(),
        email: 'phillip@allthingsnwa.com',
        role: 'agent',
        first_name: 'Phillip',
        last_name: '',
        created_at: new Date('2025-07-14').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-sahil-' + Date.now(),
        email: 'sahil@yopmail.com',
        role: 'agent',
        first_name: 'Sahil',
        last_name: '',
        created_at: new Date('2025-07-14').toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'user-john-' + Date.now(),
        email: 'john@yopmail.com',
        role: 'agent',
        first_name: 'John',
        last_name: '',
        created_at: new Date('2025-07-10').toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    // Insert all missing users
    const { data, error } = await supabase
      .from('users')
      .insert(missingUsers)
      .select()

    if (error) {
      console.error('Error creating missing users:', error)
      return NextResponse.json(
        { error: 'Failed to create missing users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Missing users created successfully',
      users: data
    })

  } catch (err) {
    console.error('Error creating missing users:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 