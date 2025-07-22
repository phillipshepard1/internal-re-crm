'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Home, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HomeStackSSOButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function HomeStackSSOButton({ 
  className = '', 
  variant = 'outline',
  size = 'default',
  children 
}: HomeStackSSOButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [canUseSSO, setCanUseSSO] = useState<boolean | null>(null)
  const { user } = useAuth()

  // Check if user can use SSO on component mount
  useEffect(() => {
    if (user?.email) {
      checkSSOAvailability()
    }
  }, [user?.email])

  const checkSSOAvailability = async () => {
    try {
      const response = await fetch('/api/homestack/sso/test')
      if (response.ok) {
        const data = await response.json()
        setCanUseSSO(data.success)
      }
    } catch (error) {
      // Error checking SSO availability
    }
  }

  const handleSSOLogin = async () => {
    if (!user?.email) {
      setError('User email not available')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/homestack/sso/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email
        })
      })

      const result = await response.json()

      if (result.success && result.loginUrl) {
        // Redirect to HomeStack SSO
        window.open(result.loginUrl, '_blank')
      } else {
        // Check if it's a "User not found" error
        if (result.error && result.error.includes('User not found')) {
          setError('Your email is not registered in HomeStack. Please contact your administrator to set up your HomeStack account.')
        } else {
          setError(result.error || 'Failed to generate SSO login URL')
        }
      }
    } catch (error) {
      console.error('SSO login error:', error)
      setError('Failed to initiate SSO login')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything if user can't use SSO
  if (canUseSSO === false) {
    return null
  }

  // Show loading state while checking
  if (canUseSSO === null) {
    return null
  }

  return (
    <div className={className}>
      <Button
        onClick={handleSSOLogin}
        disabled={isLoading || !user?.email}
        variant={variant}
        size={size}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Home className="h-4 w-4" />
        )}
        {children || 'Login to HomeStack'}
      </Button>

      {error && (
        <Alert className="mt-2">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 