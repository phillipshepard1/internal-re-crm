'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

const PUBLIC_ROUTES = ['/login', '/privacy-policy', '/terms-of-service', '/debug']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showSpinner, setShowSpinner] = useState(true)
  
  // OPTIMIZATION: Show spinner for only 2 seconds max
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpinner(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Skip if still loading
    if (loading) return

    // Public routes don't need auth
    if (PUBLIC_ROUTES.includes(pathname)) {
      // If authenticated user visits login, redirect to dashboard
      if (user && pathname === '/login') {
        router.push('/dashboard')
      }
      return
    }

    // Protected routes need auth
    if (!user) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // Show spinner only if loading AND showSpinner is true
  if (loading && showSpinner) {
    return (
      <LoadingSpinner 
        message="Setting up your account..."
        timeout={2000}
        onTimeout={() => setShowSpinner(false)}
      />
    )
  }

  // For protected routes, don't render until we know auth status
  if (!loading && !user && !PUBLIC_ROUTES.includes(pathname)) {
    return null
  }

  // Render children for all other cases
  return <>{children}</>
}