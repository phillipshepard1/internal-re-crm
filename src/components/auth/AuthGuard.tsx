'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [guardTimeout, setGuardTimeout] = useState(false)

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/privacy-policy', '/terms-of-service', '/debug']

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeoutMs = process.env.NODE_ENV === 'production' ? 12000 : 15000
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('AuthGuard: Loading timeout reached, forcing navigation', {
          environment: process.env.NODE_ENV,
          timeoutMs,
          pathname
        })
        setGuardTimeout(true)
        
        // If we're on a public route, stay there
        if (publicRoutes.includes(pathname)) {
          return
        }
        
        // Otherwise redirect to login
        router.push('/login')
      }
    }, timeoutMs)

    return () => clearTimeout(timeout)
  }, [loading, pathname, router])

  useEffect(() => {
    // If still loading and not timed out, don't do anything yet
    if (loading && !guardTimeout) return

    // If user is not authenticated and not on a public route, redirect to login
    if (!user && !publicRoutes.includes(pathname)) {
      router.push('/login')
      return
    }
    
    // If user is authenticated and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      router.push('/dashboard')
      return
    }
  }, [user, loading, router, pathname, guardTimeout])

  // Show loading spinner while loading (but not if timed out)
  if (loading && !guardTimeout) {
    return (
      <LoadingSpinner 
        message={process.env.NODE_ENV === 'production' ? 'Setting up your account...' : 'Loading...'}
        timeout={process.env.NODE_ENV === 'production' ? 8000 : 10000}
        onTimeout={() => {
          console.warn('AuthGuard: Loading timeout reached in spinner')
          setGuardTimeout(true)
        }}
      />
    )
  }

  // If user is not authenticated and not on a public route, don't render anything
  if (!user && !publicRoutes.includes(pathname)) {
    return null
  }

  // For all other cases, render children
  return <>{children}</>
} 