import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, description } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailDomain = email.split('@')[1]
    const sourceName = name || `${emailDomain} Email`
    const sourceDescription = description || `Leads from ${email}`

    // Check if this email or domain already exists
    const { data: existingSource } = await supabase
      .from('lead_sources')
      .select('*')
      .or(`email_patterns.cs.{${email}},domain_patterns.cs.{${emailDomain}}`)
      .eq('is_active', true)
      .single()

    if (existingSource) {
      return NextResponse.json({
        success: true,
        message: 'Lead source already exists',
        lead_source: existingSource
      })
    }

    // Create new lead source
    const { data, error } = await supabase
      .from('lead_sources')
      .insert({
        name: sourceName,
        description: sourceDescription,
        email_patterns: [email],
        domain_patterns: [emailDomain],
        keywords: ['form submission', 'inquiry', 'contact'],
        is_default: false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead source:', error)
      return NextResponse.json(
        { error: 'Failed to create lead source' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead source created successfully',
      lead_source: data
    })

  } catch (error) {
    console.error('Error adding email as lead source:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 