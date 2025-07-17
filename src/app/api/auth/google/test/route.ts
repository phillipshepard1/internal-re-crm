import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Google OAuth configuration...')
    
    // Test the OAuth URL generation
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    })

    if (error) {
      console.error('OAuth URL generation error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    console.log('OAuth URL generated successfully:', {
      url: data.url,
      provider: data.provider
    })

    return NextResponse.json({
      success: true,
      oauthUrl: data.url,
      provider: data.provider,
      redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 