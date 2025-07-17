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
  
  // Debug component lifecycle
  useEffect(() => {
    console.log('AuthContext: Provider mounted', {
      timestamp: new Date().toISOString()
    })

    return () => {
      console.log('AuthContext: Provider unmounted', {
        timestamp: new Date().toISOString()
      })
      
      // Clear any pending timeouts
      if (sessionValidationTimeoutRef.current) {
        clearTimeout(sessionValidationTimeoutRef.current)
      }
    }
  }, [])

  // Get user role from database
  const getUserRole = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        return null
      }

      return data?.role || null
    } catch (error) {
      console.error('Error fetching user role:', error)
      return null
    }
  }, [])

  // Validate session with debouncing
  const validateSession = useCallback(async () => {
    const now = Date.now()
    const timeSinceLastValidation = now - lastValidationRef.current
    
    // Debounce validation calls (minimum 1 second between calls)
    if (timeSinceLastValidation < 1000) {
      console.log('AuthContext: Session validation debounced', {
        timeSinceLastValidation,
        timestamp: new Date().toISOString()
      })
      return
    }
    
    lastValidationRef.current = now

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('AuthContext: Session validation error:', error)
        return
      }

      const currentUser = session?.user || null
      const currentUserId = currentUser?.id
      const previousUserId = userRef.current?.id

      // Only update if user actually changed
      if (currentUserId !== previousUserId) {
        console.log('AuthContext: Auth state change', {
          event: currentUser ? 'SIGNED_IN' : 'SIGNED_OUT',
          userEmail: currentUser?.email,
          userId: currentUserId,
          timestamp: new Date().toISOString(),
          previousUser: previousUserId
        })

        userRef.current = currentUser
        setUser(currentUser)

        if (currentUser) {
          // Get user role
          const role = await getUserRole(currentUser.id)
          userRoleRef.current = role
          setUserRole(role)
        } else {
          userRoleRef.current = null
          setUserRole(null)
        }
      }

      // Update loading state
      if (loadingRef.current) {
        loadingRef.current = false
        setLoading(false)
      }

      console.log('AuthContext: Auth state updated', {
        user: currentUserId,
        userRole: userRoleRef.current,
        loading: false,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('AuthContext: Session validation failed:', error)
      
      if (loadingRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [getUserRole])

  // Set up auth state listener
  useEffect(() => {
    console.log('AuthContext: Setting up auth listener', {
      timestamp: new Date().toISOString()
    })

    // Initial session check
    validateSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state change event', {
          event,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        })

        const currentUser = session?.user || null
        const currentUserId = currentUser?.id
        const previousUserId = userRef.current?.id

        // Only update if user actually changed
        if (currentUserId !== previousUserId) {
          console.log('AuthContext: Auth state change', {
            event,
            userEmail: currentUser?.email,
            userId: currentUserId,
            timestamp: new Date().toISOString(),
            previousUser: previousUserId
          })

          userRef.current = currentUser
          setUser(currentUser)

          if (currentUser) {
            // Get user role
            const role = await getUserRole(currentUser.id)
            userRoleRef.current = role
            setUserRole(role)
          } else {
            userRoleRef.current = null
            setUserRole(null)
          }
        }

        // Update loading state
        if (loadingRef.current) {
          loadingRef.current = false
          setLoading(false)
        }

        console.log('AuthContext: Auth state updated', {
          user: currentUserId,
          userRole: userRoleRef.current,
          loading: false,
          timestamp: new Date().toISOString()
        })
      }
    )

    return () => {
      console.log('AuthContext: Cleaning up auth listener', {
        timestamp: new Date().toISOString()
      })
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
      // Use Supabase's built-in OAuth functionality
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/callback`
        }
      })

      if (error) {
        console.error('AuthContext: Google sign in error:', error)
        return { error: error.message }
      }

      // The redirect will happen automatically
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
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthContext: Sign out error:', error)
      }
    } catch (error) {
      console.error('AuthContext: Sign out error:', error)
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

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    userRole,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    refreshSession
  }), [user, userRole, loading, signIn, signInWithGoogle, signUp, signOut, refreshSession])

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