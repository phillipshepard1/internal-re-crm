'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Activity,
  BarChart3
} from 'lucide-react'

interface EmailProcessingStats {
  total_processed: number
  leads_created: number
  failed_processing: number
  success_rate: number
  last_24_hours: {
    processed: number
    leads: number
    failed: number
  }
  lead_sources: Array<{
    name: string
    count: number
    success_rate: number
  }>
  recent_activity: Array<{
    id: string
    email_from: string
    lead_name: string
    lead_source: string
    confidence: number
    processed_at: string
    status: 'success' | 'failed' | 'duplicate'
  }>
}

export function EmailProcessingDashboard() {
  const [stats, setStats] = useState<EmailProcessingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/admin/email-processing/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch email processing stats')
      }
      
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      setError('Failed to load email processing statistics')
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  const triggerEmailProcessing = async () => {
    try {
      setRefreshing(true)
      
      const response = await fetch('/api/cron/email-processing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_TOKEN || 'test-token'}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to trigger email processing')
      }

      // Wait a moment then refresh stats
      setTimeout(() => {
        loadStats()
      }, 2000)

    } catch (error) {
      console.error('Error triggering email processing:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Processing Dashboard</CardTitle>
            <CardDescription>
              Monitor automated email-to-lead parsing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading email processing statistics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Processing Dashboard</CardTitle>
            <CardDescription>
              Monitor automated email-to-lead parsing performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
              <Button onClick={loadStats} className="mt-4">
                Try Again
              </Button>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No email processing data available.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Processing Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor automated email-to-lead parsing performance and system health
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshStats}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={triggerEmailProcessing}
            disabled={refreshing}
          >
            <Activity className="h-4 w-4 mr-2" />
            Process Emails Now
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_processed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.last_24_hours.processed} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Created</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads_created.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.last_24_hours.leads} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.failed_processing} failed attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last_24_hours.processed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.last_24_hours.leads} leads, {stats.last_24_hours.failed} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Sources Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources Performance</CardTitle>
          <CardDescription>
            Success rates by lead source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Source</TableHead>
                <TableHead>Leads Created</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.lead_sources.map((source) => (
                <TableRow key={source.name}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>{source.count}</TableCell>
                  <TableCell>{source.success_rate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={source.success_rate >= 80 ? 'default' : 'secondary'}>
                      {source.success_rate >= 80 ? 'Excellent' : 'Good'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Email Processing Activity</CardTitle>
          <CardDescription>
            Latest email processing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email From</TableHead>
                <TableHead>Lead Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recent_activity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium">
                    <div className="truncate max-w-[200px]" title={activity.email_from}>
                      {activity.email_from}
                    </div>
                  </TableCell>
                  <TableCell>{activity.lead_name || '-'}</TableCell>
                  <TableCell>{activity.lead_source}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {(activity.confidence * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      activity.status === 'success' ? 'default' : 
                      activity.status === 'duplicate' ? 'secondary' : 'destructive'
                    }>
                      {activity.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {activity.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                      {activity.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(activity.processed_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 