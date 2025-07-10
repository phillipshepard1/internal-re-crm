'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  userRole: 'admin' | 'agent' | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  roleError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'agent' | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleError, setRoleError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true;

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (error || !userData?.role) {
            console.error('User role fetch error:', error);
            if (userRole === 'admin') {
              setRoleError('Unable to verify your admin permissions. Please refresh or contact support.');
              setUserRole(null);
            } else {
              setUserRole('agent');
              setRoleError(null);
            }
          } else {
            setUserRole(userData.role);
            setRoleError(null);
          }
        } catch (err) {
          console.error('User role fetch exception:', err);
          if (userRole === 'admin') {
            setRoleError('Unable to verify your admin permissions. Please refresh or contact support.');
            setUserRole(null);
          } else {
            setUserRole('agent');
            setRoleError(null);
          }
        }
      } else {
        setUserRole(null);
        setRoleError(null);
      }
      setLoading(false); // Always set loading to false
    });

    // Listen for auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (error || !userData?.role) {
            console.error('User role fetch error:', error);
            if (userRole === 'admin') {
              setRoleError('Unable to verify your admin permissions. Please refresh or contact support.');
              setUserRole(null);
            } else {
              setUserRole('agent');
              setRoleError(null);
            }
          } else {
            setUserRole(userData.role);
            setRoleError(null);
          }
        } catch (err) {
          console.error('User role fetch exception:', err);
          if (userRole === 'admin') {
            setRoleError('Unable to verify your admin permissions. Please refresh or contact support.');
            setUserRole(null);
          } else {
            setUserRole('agent');
            setRoleError(null);
          }
        }
      } else {
        setUserRole(null);
        setRoleError(null);
      }
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    userRole,
    loading,
    signIn,
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