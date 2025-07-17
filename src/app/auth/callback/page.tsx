'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Authentication failed: ${error}`)
          return
        }

        if (!code || !state) {
          setStatus('error')
          setMessage('Missing authentication parameters')
          return
        }

        // Handle Supabase OAuth callback
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code)

        if (authError) {
          console.error('Auth callback error:', authError)
          setStatus('error')
          setMessage(authError.message || 'Authentication failed')
          return
        }

        if (data.session) {
          // Check if user exists in our users table and create/update if needed
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, role')
            .eq('email', data.session.user.email)
            .single()

          if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking user:', userError)
            setStatus('error')
            setMessage('Failed to check user account')
            return
          }

          if (!userData) {
            // Create new user with 'agent' role
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: data.session.user.id,
                  email: data.session.user.email,
                  role: 'agent'
                }
              ])

            if (insertError) {
              console.error('Error creating user:', insertError)
              setStatus('error')
              setMessage('Failed to create user account')
              return
            }
          }

          setStatus('success')
          setMessage('Authentication successful! Redirecting to dashboard...')
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No session created')
        }

      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred during authentication')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <div className="h-6 w-6 text-primary-foreground">
              {status === 'loading' && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
              )}
              {status === 'success' && '✓'}
              {status === 'error' && '✗'}
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>
          <p className="text-muted-foreground">
            {status === 'loading' && 'Please wait while we complete your sign in'}
            {status === 'success' && 'Your account has been authenticated successfully'}
            {status === 'error' && 'There was a problem with your authentication'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>
              {status === 'loading' && 'Processing your Google sign in...'}
              {status === 'success' && 'Redirecting you to the dashboard...'}
              {status === 'error' && 'Please try again or contact support'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'error' && (
              <Alert className="mb-4">
                <AlertDescription className="text-destructive">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'success' && (
              <Alert className="mb-4">
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => router.push('/login')}
                >
                  Back to Login
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 