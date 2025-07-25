'use client'

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, Clock, CheckCircle, AlertCircle, Users, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface ProcessingResult {
  userId: string
  email: string
  processed: number
  error?: string
}

interface ProcessingSummary {
  totalProcessed: number
  totalUsers: number
  successfulUsers: number
  failedUsers: number
}

interface ProcessingStats {
  lastRun: string | null
  totalLeadsProcessed: number
  successRate: number
  averageProcessingTime: number
}

export function EmailProcessingDashboard() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ProcessingStats>({
    lastRun: null,
    totalLeadsProcessed: 0,
    successRate: 0,
    averageProcessingTime: 0
  })
  const [lastResults, setLastResults] = useState<{
    summary: ProcessingSummary
    results: ProcessingResult[]
  } | null>(null)
  const [gmailIntegrations, setGmailIntegrations] = useState<Array<{
    user_id: string
    gmail_email: string
    is_active: boolean
    last_used: string | null
  }>>([])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/email-processing/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setGmailIntegrations(data.gmailIntegrations || [])
      }
    } catch (error) {
      console.error('Error loading email processing stats:', error)
    }
  }

  const triggerProcessing = async () => {
    setLoading(true)
    try {
      // Get the cron secret token from environment or generate a temporary one
      // For admin dashboard access, we'll use a different approach
      const response = await fetch('/api/admin/email-processing/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setLastResults({
          summary: data.summary,
          results: data.results
        })
        toast.success('Email Processing Completed', {
          description: `Processed ${data.summary.totalProcessed} leads from ${data.summary.successfulUsers} users`
        })
        await loadStats() // Refresh stats
      } else {
        throw new Error(data.error || 'Failed to process emails')
      }
    } catch (error) {
      console.error('Error triggering email processing:', error)
      toast.error('Failed to Process Emails', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const activeIntegrations = gmailIntegrations.filter(g => g.is_active)
  const inactiveIntegrations = gmailIntegrations.filter(g => !g.is_active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Processing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor automated email-to-lead processing and Gmail integrations
          </p>
        </div>
        <Button 
          onClick={triggerProcessing} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {loading ? 'Processing...' : 'Process Emails Now'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads Processed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeadsProcessed}</div>
            <p className="text-xs text-muted-foreground">
              All time processed leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful processing rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Connected Gmail accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastRun ? new Date(stats.lastRun).toLocaleDateString() : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last automated run
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gmail Integrations Status */}
      <Card>
        <CardHeader>
          <CardTitle>Gmail Integrations</CardTitle>
          <CardDescription>
            Status of connected Gmail accounts for automated email processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gmailIntegrations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No Gmail integrations found. Users need to connect their Gmail accounts in the inbox page.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {activeIntegrations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Active Integrations ({activeIntegrations.length})</h4>
                  <div className="space-y-2">
                    {activeIntegrations.map((integration) => (
                      <div key={integration.user_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{integration.gmail_email}</span>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inactiveIntegrations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Inactive Integrations ({inactiveIntegrations.length})</h4>
                  <div className="space-y-2">
                    {inactiveIntegrations.map((integration) => (
                      <div key={integration.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{integration.gmail_email}</span>
                        </div>
                        <Badge variant="outline">Inactive</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Processing Results */}
      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle>Last Processing Results</CardTitle>
            <CardDescription>
              Results from the most recent email processing run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {lastResults.summary.totalProcessed}
                  </div>
                  <div className="text-sm text-muted-foreground">Leads Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lastResults.summary.successfulUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {lastResults.summary.failedUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {lastResults.summary.totalUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </div>

              {lastResults.results.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Processing Details</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {lastResults.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {result.error ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium">{result.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.error ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            <Badge variant="secondary">{result.processed} processed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 