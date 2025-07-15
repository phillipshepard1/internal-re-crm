'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/privacy-policy', '/terms-of-service']

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      router.push('/login')
    }
    
    // If user is authenticated and on login page, redirect to dashboard
    if (!loading && user && pathname === '/login') {
      router.push('/dashboard')
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated and not on a public route, don't render anything
  if (!user && !publicRoutes.includes(pathname)) {
    return null
  }

  // For all other cases, render children
  return <>{children}</>
} 