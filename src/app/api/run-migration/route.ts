import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { migrationName } = body

    if (!migrationName) {
      return NextResponse.json(
        { error: 'Migration name is required' },
        { status: 400 }
      )
    }

    // Define available migrations
    const migrations: Record<string, string> = {
      'add-followup-fields': `
        ALTER TABLE follow_ups 
        ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'call',
        ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;
      `,
      'add-user-fields': `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
      `,
      'create-round-robin-table': `
        CREATE TABLE IF NOT EXISTS round_robin_config (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT true,
          priority INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_round_robin_active ON round_robin_config(is_active, priority);
      `
    }

    const migrationSQL = migrations[migrationName]
    if (!migrationSQL) {
      return NextResponse.json(
        { error: `Unknown migration: ${migrationName}` },
        { status: 400 }
      )
    }

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json(
        { error: 'Migration failed', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Migration '${migrationName}' executed successfully`
    })

  } catch (err: unknown) {
    console.error('Migration execution error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 