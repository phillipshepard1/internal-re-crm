'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { User } from '@supabase/supabase-js'

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface AuthContextType {
  user: User | null
  userRole: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signUp: (email: string, password: string, role: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshUserRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use refs to prevent unnecessary re-renders
  const userRef = useRef<User | null>(null)
  const userRoleRef = useRef<string | null>(null)
  const loadingRef = useRef(true)
  const sessionValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastValidationRef = useRef(0)
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debug component lifecycle
  useEffect(() => {
    console.log('AuthContext: Provider mounted', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    })

    // Test database connection with production-specific timeout
    const testConnection = async () => {
      try {
        const timeoutMs = process.env.NODE_ENV === 'production' ? 3000 : 5000
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout')), timeoutMs)
        })

        const connectionPromise = supabase
          .from('users')
          .select('count')
          .limit(1)

        const { data, error } = await Promise.race([connectionPromise, timeoutPromise])
        
        if (error) {
          console.error('AuthContext: Database connection test failed:', error)
        } else {
          console.log('AuthContext: Database connection test successful')
        }
      } catch (error) {
        console.error('AuthContext: Database connection test error:', error)
      }
    }
    
    testConnection()

    // Set a timeout to prevent infinite loading (shorter in production)
    const timeoutMs = process.env.NODE_ENV === 'production' ? 8000 : 10000
    authTimeoutRef.current = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('AuthContext: Loading timeout reached, forcing completion', {
          environment: process.env.NODE_ENV,
          timeoutMs
        })
        loadingRef.current = false
        setLoading(false)
        
        // If we have a user but no role, set a default role
        if (userRef.current && !userRoleRef.current) {
          console.log('AuthContext: Setting default role due to timeout')
          userRoleRef.current = 'agent'
          setUserRole('agent')
        }
      }
    }, timeoutMs)

    return () => {
      console.log('AuthContext: Provider unmounted', {
        timestamp: new Date().toISOString()
      })
      
      // Clear any pending timeouts
      if (sessionValidationTimeoutRef.current) {
        clearTimeout(sessionValidationTimeoutRef.current)
      }
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
      }
    }
  }, [])

  // Get user role from database with caching
  const getUserRole = useCallback(async (userId: string): Promise<string | null> => {
    const maxRetries = process.env.NODE_ENV === 'production' ? 2 : 3
    const timeoutMs = process.env.NODE_ENV === 'production' ? 3000 : 5000
    let lastError: Error | null = null

    // Try to get cached role first
    if (typeof window !== 'undefined') {
      const cachedRole = localStorage.getItem(`user_role_${userId}`)
      const cachedTimestamp = localStorage.getItem(`user_role_timestamp_${userId}`)
      
      if (cachedRole && cachedTimestamp) {
        const cacheAge = Date.now() - parseInt(cachedTimestamp)
        const cacheValidMs = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 10 * 60 * 1000 // 5 min in prod, 10 min in dev
        
        if (cacheAge < cacheValidMs) {
          console.log(`AuthContext: Using cached user role: ${cachedRole}`)
          return cachedRole
        } else {
          // Clear expired cache
          localStorage.removeItem(`user_role_${userId}`)
          localStorage.removeItem(`user_role_timestamp_${userId}`)
        }
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AuthContext: Getting user role (attempt ${attempt}/${maxRetries})`, {
          environment: process.env.NODE_ENV,
          timeoutMs
        })
        
        // Add timeout to prevent hanging (shorter in production)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Database timeout')), timeoutMs)
        })

        const rolePromise = supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single()

        const { data, error } = await Promise.race([rolePromise, timeoutPromise])

        if (error) {
          console.error(`AuthContext: Error fetching user role (attempt ${attempt}):`, error)
          lastError = new Error(error.message)
          
          if (attempt === maxRetries) {
            // On final failure, try to use cached role even if expired
            if (typeof window !== 'undefined') {
              const fallbackRole = localStorage.getItem(`user_role_${userId}`)
              if (fallbackRole) {
                console.log(`AuthContext: Using expired cached role as fallback: ${fallbackRole}`)
                return fallbackRole
              }
            }
            return null
          }
          
          // Wait before retrying (shorter delay in production)
          const delayMs = process.env.NODE_ENV === 'production' ? 500 * attempt : 1000 * attempt
          await new Promise(resolve => setTimeout(resolve, delayMs))
          continue
        }

        const role = data?.role || null
        console.log(`AuthContext: Successfully got user role: ${role}`)
        
        // Cache the successful result
        if (typeof window !== 'undefined' && role) {
          localStorage.setItem(`user_role_${userId}`, role)
          localStorage.setItem(`user_role_timestamp_${userId}`, Date.now().toString())
        }
        
        return role

      } catch (error) {
        console.error(`AuthContext: Error fetching user role (attempt ${attempt}):`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === maxRetries) {
          // On final failure, try to use cached role even if expired
          if (typeof window !== 'undefined') {
            const fallbackRole = localStorage.getItem(`user_role_${userId}`)
            if (fallbackRole) {
              console.log(`AuthContext: Using expired cached role as fallback: ${fallbackRole}`)
              return fallbackRole
            }
          }
          return null
        }
        
        // Wait before retrying (shorter delay in production)
        const delayMs = process.env.NODE_ENV === 'production' ? 500 * attempt : 1000 * attempt
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    console.error('AuthContext: Failed to get user role after all retries:', lastError)
    return null
  }, [])

  // Validate session and update state
  const validateSession = useCallback(async () => {
    const now = Date.now()
    const timeSinceLastValidation = now - lastValidationRef.current
    
    // Debounce validation calls (minimum 1 second between calls)
    if (timeSinceLastValidation < 1000) {
      return
    }
    
    lastValidationRef.current = now

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // If there's an error or no session, clear the user state
      if (error || !session) {
        userRef.current = null
        setUser(null)
        userRoleRef.current = null
        setUserRole(null)
        
        if (loadingRef.current) {
          loadingRef.current = false
          setLoading(false)
          // Clear the auth timeout since we're done loading
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current)
            authTimeoutRef.current = null
          }
        }
        return
      }

      const currentUser = session.user
      const currentUserId = currentUser?.id
      const previousUserId = userRef.current?.id

      // Only update if user actually changed
      if (currentUserId !== previousUserId) {
        userRef.current = currentUser
        setUser(currentUser)

        if (currentUser) {
          // Get user role
          try {
            const role = await getUserRole(currentUser.id)
            userRoleRef.current = role
            setUserRole(role)
          } catch (error) {
            console.error('AuthContext: Error getting user role:', error)
            // Set default role if there's an error
            userRoleRef.current = 'agent'
            setUserRole('agent')
          }
        } else {
          userRoleRef.current = null
          setUserRole(null)
        }
      }

      // Update loading state
      if (loadingRef.current) {
        loadingRef.current = false
        setLoading(false)
        // Clear the auth timeout since we're done loading
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current)
          authTimeoutRef.current = null
        }
      }

    } catch (error) {
      console.error('AuthContext: Session validation failed:', error)
      
      // Clear user state on error
      userRef.current = null
      setUser(null)
      userRoleRef.current = null
      setUserRole(null)
      
      if (loadingRef.current) {
        loadingRef.current = false
        setLoading(false)
        // Clear the auth timeout since we're done loading
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current)
          authTimeoutRef.current = null
        }
      }
    }
  }, [getUserRole])

  // Set up auth state listener
  useEffect(() => {
    // Initial session check
    validateSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null
        const currentUserId = currentUser?.id
        const previousUserId = userRef.current?.id

        // Only update if user actually changed
        if (currentUserId !== previousUserId) {
          userRef.current = currentUser
          setUser(currentUser)

          if (currentUser) {
            // Get user role
            try {
              const role = await getUserRole(currentUser.id)
              userRoleRef.current = role
              setUserRole(role)
            } catch (error) {
              console.error('AuthContext: Auth listener - Error getting user role:', error)
              // Set default role if there's an error
              userRoleRef.current = 'agent'
              setUserRole('agent')
            }
          } else {
            userRoleRef.current = null
            setUserRole(null)
          }
        }

        // Update loading state
        if (loadingRef.current) {
          loadingRef.current = false
          setLoading(false)
          // Clear the auth timeout since we're done loading
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current)
            authTimeoutRef.current = null
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [validateSession, getUserRole])

  // Set up periodic session validation (every 5 minutes)
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      // Add a small delay to avoid interference with data loading
      sessionValidationTimeoutRef.current = setTimeout(() => {
        validateSession()
      }, 1000)
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => {
      clearInterval(interval)
      if (sessionValidationTimeoutRef.current) {
        clearTimeout(sessionValidationTimeoutRef.current)
      }
    }
  }, [user?.id, validateSession])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('AuthContext: Sign in error:', error)
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      console.error('AuthContext: Sign in error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      // Force sign out any existing session to ensure clean OAuth flow
      await supabase.auth.signOut()
      
      // Wait a moment for sign out to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use Supabase's built-in OAuth functionality
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
          queryParams: {
            prompt: 'select_account', // Force account selection
            access_type: 'offline'
          }
        }
      })

      if (error) {
        console.error('AuthContext: Google sign in error:', error)
        return { error: error.message }
      }

      // Let Supabase handle the redirect automatically
      return { error: null }
    } catch (error) {
      console.error('AuthContext: Google sign in error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to initiate Google sign in' }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('AuthContext: Sign up error:', error)
        return { error: error.message }
      }

      if (data.user) {
        // Insert user role into database
        const { error: roleError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: role
            }
          ])

        if (roleError) {
          console.error('AuthContext: Role insertion error:', roleError)
          return { error: 'Failed to set user role' }
        }
      }

      return { error: null }
    } catch (error) {
      console.error('AuthContext: Sign up error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      // Clear Supabase session
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthContext: Sign out error:', error)
      }
      
      // Clear all browser storage
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear()
        
        // Clear sessionStorage
        sessionStorage.clear()
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos) : c
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        })
        
        // Clear Google OAuth related cookies and storage
        const googleCookies = [
          'G_AUTHUSER_H',
          'SSID',
          'SID',
          'HSID',
          'APISID',
          'SAPISID',
          'NID',
          '1P_JAR',
          'AEC',
          'OTZ'
        ]
        
        googleCookies.forEach(cookieName => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=google.com`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })
        
        // Clear any Google OAuth state from localStorage
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('google') || key.includes('oauth') || key.includes('auth'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Clear any Supabase related storage
        const supabaseKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.includes('supabase')) {
            supabaseKeys.push(key)
          }
        }
        supabaseKeys.forEach(key => localStorage.removeItem(key))
        
        // Clear user role cache
        if (userRef.current?.id) {
          localStorage.removeItem(`user_role_${userRef.current.id}`)
          localStorage.removeItem(`user_role_timestamp_${userRef.current.id}`)
        }
      }
      
      // Force clear user state immediately
      userRef.current = null
      setUser(null)
      userRoleRef.current = null
      setUserRole(null)
      
      // Force reload to clear any remaining session state
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('AuthContext: Sign out error:', error)
      
      // Force clear user state even on error
      userRef.current = null
      setUser(null)
      userRoleRef.current = null
      setUserRole(null)
      
      // Force reload even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('AuthContext: Session refresh error:', error)
      }
    } catch (error) {
      console.error('AuthContext: Session refresh error:', error)
    }
  }, [])

  const refreshUserRole = useCallback(async () => {
    if (!userRef.current?.id) return
    
    try {
      console.log('AuthContext: Refreshing user role...')
      
      // Clear cached role to force fresh fetch
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`user_role_${userRef.current.id}`)
        localStorage.removeItem(`user_role_timestamp_${userRef.current.id}`)
      }
      
      // Fetch fresh role
      const role = await getUserRole(userRef.current.id)
      userRoleRef.current = role
      setUserRole(role)
      
      console.log('AuthContext: User role refreshed:', role)
    } catch (error) {
      console.error('AuthContext: Error refreshing user role:', error)
    }
  }, [getUserRole])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    userRole,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshSession,
    refreshUserRole
  }), [user, userRole, loading, signIn, signInWithGoogle, signUp, signOut, refreshSession, refreshUserRole])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 