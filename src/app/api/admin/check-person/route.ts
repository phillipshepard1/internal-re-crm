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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('id')

    if (!personId) {
      return NextResponse.json(
        { error: 'Person ID is required' },
        { status: 400 }
      )
    }

    // Get the person details
    const { data: person, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single()

    if (error || !person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    // Get activities for this person
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get processed emails for this person
    const { data: processedEmails } = await supabase
      .from('processed_emails')
      .select('*')
      .eq('person_id', personId)
      .order('processed_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      person,
      activities: activities || [],
      processedEmails: processedEmails || []
    })

  } catch (error) {
    console.error('Error checking person:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}