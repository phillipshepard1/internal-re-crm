import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Example: create a table if it doesn't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS test_table (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255)
        );
      `
    })

    if (error) {
      console.error('Setup DB error:', error)
      return NextResponse.json({ error: 'Failed to setup DB', details: (error as { message?: string }).message || String(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Database setup complete' })
  } catch (err: unknown) {
    console.error('Setup DB error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Test table access
    const { data, error } = await supabase
      .from('round_robin_config')
      .select('*')
      .limit(5)
    
    if (error) {
      return NextResponse.json({ 
        error: 'Table access failed', 
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Table accessible',
      recordCount: data?.length || 0,
      data
    })
    
  } catch (error: unknown) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: (error as { message?: string }).message || String(error) 
    }, { status: 500 })
  }
} 