'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestDbPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const testDatabaseConnection = async () => {
    try {
      setLoading(true)
      setError('')
      setResult('')

      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(JSON.stringify(data, null, 2))
      } else {
        setError(data.error || 'Database test failed')
      }
    } catch (err: unknown) {
      console.error('Database test error:', err)
      setError(err instanceof Error ? err.message : 'Database test failed')
    } finally {
      setLoading(false)
    }
  }

  const testMigration = async () => {
    try {
      setLoading(true)
      setError('')
      setResult('')

      const response = await fetch('/api/run-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          migrationName: 'add-followup-fields'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(JSON.stringify(data, null, 2))
      } else {
        setError(data.error || 'Migration test failed')
      }
    } catch (err: unknown) {
      console.error('Migration test error:', err)
      setError(err instanceof Error ? err.message : 'Migration test failed')
    } finally {
      setLoading(false)
    }
  }

  const testRoundRobin = async () => {
    try {
      setLoading(true)
      setError('')
      setResult('')

      const response = await fetch('/api/run-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          migrationName: 'create-round-robin-table'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(JSON.stringify(data, null, 2))
      } else {
        setError(data.error || 'Round Robin setup failed')
      }
    } catch (err: unknown) {
      console.error('Round Robin test error:', err)
      setError(err instanceof Error ? err.message : 'Round Robin setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Database Test</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Test Database Connection</CardTitle>
            <CardDescription>
              Test if the database connection is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testDatabaseConnection} disabled={loading}>
              {loading ? 'Testing...' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Migration</CardTitle>
            <CardDescription>
              Test database migration functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testMigration} disabled={loading}>
              {loading ? 'Testing...' : 'Test Migration'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Round Robin</CardTitle>
            <CardDescription>
              Create Round Robin table for lead distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testRoundRobin} disabled={loading}>
              {loading ? 'Setting up...' : 'Setup Round Robin'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
          <CardDescription>
            Current database status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Database URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}</p>
            <p><strong>Service Role Key:</strong> {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Not configured'}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 