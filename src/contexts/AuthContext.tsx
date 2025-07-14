'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  userRole: 'admin' | 'agent' | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  roleError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Always assign 'agent' role to new users
const assignUserRole = async (user: User): Promise<'agent'> => {
  const { error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      role: 'agent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  if (error) {
    console.error('Error assigning user role:', error)
    throw error
  }
  return 'agent'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'agent' | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true;



    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          // Try to fetch user row
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // If user row is missing, create it as agent
          if (error && (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows'))) {
            await assignUserRole(session.user)
            setUserRole('agent')
            setRoleError(null)
            return
          }

          // If user row exists but role is missing/invalid, update it to agent
          if (userData && (!userData.role || !['admin', 'agent'].includes(userData.role))) {
            await assignUserRole(session.user)
            setUserRole('agent')
            setRoleError(null)
            return
          }

          if (error || !userData?.role) {
            setUser(null);
            setUserRole(null);
            setRoleError('Unable to verify your permissions.');
          } else {
            setUserRole(userData.role);
            setRoleError(null);
          }
        } else {
          setUserRole(null);
          setRoleError(null);
        }
      } catch (error) {
        console.error('Session restoration error:', error)
        setUser(null);
        setUserRole(null);
        setRoleError('Session restoration failed.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    // Listen for auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          // Try to fetch user row
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // If user row is missing, create it as agent
          if (error && (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows'))) {
            await assignUserRole(session.user)
            setUserRole('agent')
            setRoleError(null)
            setLoading(false)
            return
          }

          // If user row exists but role is missing/invalid, update it to agent
          if (userData && (!userData.role || !['admin', 'agent'].includes(userData.role))) {
            await assignUserRole(session.user)
            setUserRole('agent')
            setRoleError(null)
            setLoading(false)
            return
          }

          if (error || !userData?.role) {
            setUser(null);
            setUserRole(null);
            setRoleError('Unable to verify your permissions.');
          } else {
            setUserRole(userData.role);
            setRoleError(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setUser(null);
          setUserRole(null);
          setRoleError('Unable to verify your permissions.');
        }
      } else {
        setUserRole(null);
        setRoleError(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      // Clear local storage and session storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear user state immediately
      setUser(null)
      setUserRole(null)
      setRoleError(null)
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if there's an error, clear the state
      setUser(null)
      setUserRole(null)
      setRoleError(null)
      throw error
    }
  }

  const value = {
    user,
    userRole,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    roleError,
  }

  return (
    <AuthContext.Provider value={value}>
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