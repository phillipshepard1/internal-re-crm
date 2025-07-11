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

    async function restoreSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          // Try to fetch user row
          let { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

          // If user row is missing, create it
          if (error && (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows'))) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                role: 'agent', // default role
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            if (insertError) throw insertError;
            // Try fetching again
            ({ data: userData, error } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single());
          }

          // If user row exists but role is missing/invalid, update it
          if (userData && (!userData.role || !['admin', 'agent'].includes(userData.role))) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ role: 'agent', updated_at: new Date().toISOString() })
              .eq('id', session.user.id);
            if (updateError) throw updateError;
            userData.role = 'agent';
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
      } catch {
        setUser(null);
        setUserRole(null);
        setRoleError('Session restoration failed.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    // Listen for auth changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Try to fetch user row
        let { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        // If user row is missing, create it
        if (error && (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows'))) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              role: 'agent', // default role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          if (insertError) {
            setUser(null);
            setUserRole(null);
            setRoleError('Unable to create user profile.');
            setLoading(false);
            return;
          }
          // Try fetching again
          ({ data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single());
        }

        // If user row exists but role is missing/invalid, update it
        if (userData && (!userData.role || !['admin', 'agent'].includes(userData.role))) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'agent', updated_at: new Date().toISOString() })
            .eq('id', session.user.id);
          if (updateError) {
            setUser(null);
            setUserRole(null);
            setRoleError('Unable to update user role.');
            setLoading(false);
            return;
          }
          userData.role = 'agent';
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