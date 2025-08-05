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

// OPTIMIZATION 1: Combine user data fetching into a single query
async function fetchUserData(userId: string): Promise<{ role: string | null; status: string | null }> {
  try {
    // Check cache first
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(`user_data_${userId}`)
      const cachedTimestamp = localStorage.getItem(`user_data_timestamp_${userId}`)
      
      if (cachedData && cachedTimestamp) {
        const cacheAge = Date.now() - parseInt(cachedTimestamp)
        const cacheValidMs = 5 * 60 * 1000 // 5 minutes
        
        if (cacheAge < cacheValidMs) {
          return JSON.parse(cachedData)
        }
      }
    }

    // Single query to get both role and status with timeout
    const queryPromise = supabase
      .from('users')
      .select('role, status')
      .eq('id', userId)
      .single()
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 2000)
    )
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise])

    if (error) throw error

    const result = {
      role: data?.role || 'agent',
      status: data?.status || 'active'
    }

    // Cache the result
    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_data_${userId}`, JSON.stringify(result))
      localStorage.setItem(`user_data_timestamp_${userId}`, Date.now().toString())
    }

    return result
  } catch (error) {
    console.error('Error fetching user data:', error)
    // Return defaults on error
    return { role: 'agent', status: 'active' }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use refs to prevent unnecessary re-renders
  const userRef = useRef<User | null>(null)
  const userRoleRef = useRef<string | null>(null)
  const authInitializedRef = useRef(false)
  
  // OPTIMIZATION 2: Faster initialization
  useEffect(() => {
    const initAuth = async () => {
      if (authInitializedRef.current) return
      authInitializedRef.current = true

      try {
        // Get session with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 3000)
        )

        const result = await Promise.race([sessionPromise, timeoutPromise])
        
        if (!result || result.error || !result.data?.session) {
          setLoading(false)
          return
        }

        const session = result.data.session
        const currentUser = session.user

        // Fetch user data in parallel with setting user
        setUser(currentUser)
        userRef.current = currentUser

        // Fetch additional user data
        const userData = await fetchUserData(currentUser.id)
        
        if (userData.status === 'archived') {
          await supabase.auth.signOut()
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        setUserRole(userData.role)
        userRoleRef.current = userData.role
        
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  // OPTIMIZATION 3: Simplified auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user || null
        
        // Quick update for logout
        if (!currentUser) {
          setUser(null)
          setUserRole(null)
          userRef.current = null
          userRoleRef.current = null
          return
        }

        // Only fetch additional data if user changed
        if (currentUser.id !== userRef.current?.id) {
          setUser(currentUser)
          userRef.current = currentUser

          // Fetch user data asynchronously
          fetchUserData(currentUser.id).then(userData => {
            if (userData.status !== 'archived') {
              setUserRole(userData.role)
              userRoleRef.current = userData.role
            } else {
              supabase.auth.signOut()
            }
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // OPTIMIZATION 4: Faster sign in with optimistic updates
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Optimistically set user
        setUser(data.user)
        userRef.current = data.user
        
        // Fetch role in background
        fetchUserData(data.user.id).then(userData => {
          setUserRole(userData.role)
          userRoleRef.current = userData.role
        })
      }

      return { error: null }
    } catch (error: any) {
      return { error: error.message || 'An error occurred during sign in' }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error: any) {
      return { error: error.message || 'An error occurred during Google sign in' }
    }
  }

  const signUp = async (email: string, password: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role }
        }
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error: any) {
      return { error: error.message || 'An error occurred during sign up' }
    }
  }

  const signOut = async () => {
    try {
      // Clear all caches
      if (typeof window !== 'undefined') {
        const userId = userRef.current?.id
        if (userId) {
          localStorage.removeItem(`user_data_${userId}`)
          localStorage.removeItem(`user_data_timestamp_${userId}`)
        }
      }

      await supabase.auth.signOut()
      
      // Clear state
      setUser(null)
      setUserRole(null)
      userRef.current = null
      userRoleRef.current = null
    } catch (error) {
      console.error('Error signing out:', error)
      // Force clear even on error
      setUser(null)
      setUserRole(null)
      userRef.current = null
      userRoleRef.current = null
    }
  }

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.refreshSession()
      if (session?.user && session.user.id === userRef.current?.id) {
        // Session refreshed successfully
        return
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
    }
  }

  const refreshUserRole = async () => {
    if (!user?.id) return
    
    try {
      const userData = await fetchUserData(user.id)
      setUserRole(userData.role)
      userRoleRef.current = userData.role
    } catch (error) {
      console.error('Error refreshing user role:', error)
    }
  }

  const value = useMemo(
    () => ({
      user,
      userRole,
      loading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      refreshSession,
      refreshUserRole,
    }),
    [user, userRole, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}