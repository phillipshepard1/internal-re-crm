import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Since we can't use exec_sql, let's try to add the fields one by one
    // We'll use a simple approach: try to insert a test record with the new fields
    // If it fails, the fields don't exist and we need to add them manually
    
    const testData = {
      first_name: 'Test',
      last_name: 'User',
      email: ['test@example.com'],
      phone: ['123-456-7890'],
      company: 'Test Company',
      position: 'Test Position',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345',
      country: 'Test Country',
      lead_source: 'test',
      looking_for: 'Test Property',
      selling: 'Test Property',
      closed: 'Test Property',
      assigned_to: '00000000-0000-0000-0000-000000000000' // Dummy UUID
    }
    
    // Try to insert the test data
    const { data, error } = await supabase
      .from('people')
      .insert([testData])
      .select()
    
    if (error) {
      console.error('Migration test failed:', error)
      return NextResponse.json({ 
        error: 'Database schema needs to be updated manually', 
        details: error.message,
        action: 'Please add the missing fields to the people table in your Supabase dashboard'
      }, { status: 500 })
    }
    
    // If successful, delete the test record
    if (data && data[0]) {
      await supabase
        .from('people')
        .delete()
        .eq('id', data[0].id)
    }
    
    return NextResponse.json({ 
      message: 'Database schema is up to date',
      fieldsAvailable: true
    })
    
  } catch (error: any) {
    console.error('Migration check failed:', error)
    return NextResponse.json({ 
      error: 'Migration check failed', 
      details: error.message 
    }, { status: 500 })
  }
} 