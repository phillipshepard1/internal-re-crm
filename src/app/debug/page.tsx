'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { testDatabaseConnection } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function DebugPage() {
  const { user, userRole, loading, refreshUserRole } = useAuth()
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string } | null>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toISOString()}: ${result}`])
  }

  const testDatabase = async () => {
    addTestResult('Testing database connection...')
    try {
      const result = await testDatabaseConnection()
      setDbStatus(result)
      addTestResult(`Database test result: ${result.connected ? 'Connected' : 'Failed'} - ${result.error || 'No error'}`)
    } catch (error) {
      addTestResult(`Database test error: ${error}`)
    }
  }

  const testSession = async () => {
    addTestResult('Testing session...')
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      setSessionInfo({ session, error })
      addTestResult(`Session test result: ${session ? 'Has session' : 'No session'} - ${error || 'No error'}`)
    } catch (error) {
      addTestResult(`Session test error: ${error}`)
    }
  }

  const clearStorage = () => {
    addTestResult('Clearing storage...')
    localStorage.clear()
    sessionStorage.clear()
    addTestResult('Storage cleared')
  }

  const testRoleCache = () => {
    addTestResult('Testing role cache...')
    if (user?.id) {
      const cachedRole = localStorage.getItem(`user_role_${user.id}`)
      const cachedTimestamp = localStorage.getItem(`user_role_timestamp_${user.id}`)
      
      if (cachedRole && cachedTimestamp) {
        const cacheAge = Date.now() - parseInt(cachedTimestamp)
        const cacheValidMs = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 10 * 60 * 1000
        const isValid = cacheAge < cacheValidMs
        
        addTestResult(`Role cache found: ${cachedRole} (age: ${Math.round(cacheAge/1000)}s, valid: ${isValid})`)
      } else {
        addTestResult('No role cache found')
      }
    } else {
      addTestResult('No user ID available for cache test')
    }
  }

  const clearRoleCache = () => {
    addTestResult('Clearing role cache...')
    if (user?.id) {
      localStorage.removeItem(`user_role_${user.id}`)
      localStorage.removeItem(`user_role_timestamp_${user.id}`)
      addTestResult('Role cache cleared')
    } else {
      addTestResult('No user ID available for cache clear')
    }
  }

  const refreshRole = async () => {
    addTestResult('Refreshing user role...')
    try {
      await refreshUserRole()
      addTestResult('User role refreshed successfully')
    } catch (error) {
      addTestResult(`Error refreshing role: ${error}`)
    }
  }

  useEffect(() => {
    testDatabase()
    testSession()
  }, [])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Debug Information</h2>
          <p className="text-muted-foreground">
            Diagnostic information for authentication and database issues
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
            <div><strong>User:</strong> {user ? `${user.email} (${user.id})` : 'None'}</div>
            <div><strong>Role:</strong> {userRole || 'None'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div><strong>Connected:</strong> {dbStatus?.connected ? 'Yes' : 'No'}</div>
            {dbStatus?.error && (
              <Alert variant="destructive">
                <AlertDescription>{dbStatus.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={testDatabase} variant="outline" className="w-full">
              Test Database
            </Button>
            <Button onClick={testSession} variant="outline" className="w-full">
              Test Session
            </Button>
            <Button onClick={testRoleCache} variant="outline" className="w-full">
              Test Role Cache
            </Button>
            <Button onClick={clearRoleCache} variant="outline" className="w-full">
              Clear Role Cache
            </Button>
            <Button onClick={clearStorage} variant="outline" className="w-full">
              Clear Storage
            </Button>
            <Button onClick={refreshRole} variant="outline" className="w-full">
              Refresh Role
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-60 overflow-auto">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono bg-muted p-1 rounded">
                {result}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 