import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    console.log('Diagnosing Google OAuth configuration...')
    
    // Check environment variables
    const envCheck = {
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
    }

    // Test Supabase connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Test OAuth URL generation
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    })

    const recommendations: string[] = []

    // Generate recommendations
    if (!envCheck.supabaseUrl || !envCheck.supabaseAnonKey) {
      recommendations.push('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    if (sessionError) {
      recommendations.push(`Supabase connection error: ${sessionError.message}`)
    }

    if (oauthError) {
      recommendations.push(`OAuth configuration error: ${oauthError.message}`)
    }

    if (!oauthData?.url) {
      recommendations.push('OAuth URL not generated - check Supabase Google provider configuration')
    }

    const diagnosis = {
      environment: envCheck,
      supabaseConnection: {
        success: !sessionError,
        error: sessionError?.message,
        hasSession: !!session
      },
      oauthConfiguration: {
        success: !oauthError,
        error: oauthError?.message,
        hasOAuthUrl: !!oauthData?.url,
        oauthUrl: oauthData?.url,
        provider: oauthData?.provider
      },
      redirectUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
      recommendations
    }

    return NextResponse.json(diagnosis)

  } catch (error) {
    console.error('Diagnosis error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: ['Check server logs for detailed error information']
    })
  }
} 