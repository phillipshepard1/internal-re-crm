import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('round_robin_config')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE round_robin_config (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            is_active boolean DEFAULT true,
            priority integer DEFAULT 0,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
          );
          
          CREATE INDEX idx_round_robin_active_priority ON round_robin_config(is_active, priority);
        `
      })
      
      if (createError) {
        return NextResponse.json({ 
          error: 'Failed to create table', 
          details: createError.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        message: 'Table created successfully',
        tableExists: true
      })
    }
    
    return NextResponse.json({ 
      message: 'Table already exists',
      tableExists: true
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error.message 
    }, { status: 500 })
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
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error.message 
    }, { status: 500 })
  }
} 