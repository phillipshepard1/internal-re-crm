'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Activity, 
  Brain, 
  Mail, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  RefreshCw
} from 'lucide-react'

interface AIProcessingStats {
  processing_source: string
  total_processed: number
  leads_created: number
  success_rate: number
  avg_confidence: number
  high_confidence_rate: number
}

interface RecentProcessing {
  id: string
  email_id: string
  from: string
  subject: string
  processed_at: string
  processing_source: string
  ai_confidence: number
  person_id: string | null
  success: boolean
}

export function N8NIntegrationDashboard() {
  const [stats, setStats] = useState<AIProcessingStats[]>([])
  const [recentProcessing, setRecentProcessing] = useState<RecentProcessing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load AI processing statistics
      const statsResponse = await fetch('/api/admin/ai-processing-stats')
      if (!statsResponse.ok) throw new Error('Failed to load AI processing stats')
      const statsData = await statsResponse.json()

      // Load recent processing
      const recentResponse = await fetch('/api/admin/recent-processing')
      if (!recentResponse.ok) throw new Error('Failed to load recent processing')
      const recentData = await recentResponse.json()

      setStats(statsData.stats || [])
      setRecentProcessing(recentData.processing || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'n8n': return <Brain className="h-4 w-4" />
      case 'cron': return <Clock className="h-4 w-4" />
      case 'manual': return <Activity className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">N8N Integration Dashboard</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">N8N Integration Dashboard</h2>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">N8N Integration Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor AI-powered email processing performance
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.processing_source}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.processing_source.toUpperCase()} Processing
              </CardTitle>
              {getSourceIcon(stat.processing_source)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.total_processed}</div>
              <p className="text-xs text-muted-foreground">
                {stat.leads_created} leads created ({stat.success_rate.toFixed(1)}% success)
              </p>
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Avg Confidence: {(stat.avg_confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Processing</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Summary</CardTitle>
              <CardDescription>
                Overall performance across all processing sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.reduce((sum, s) => sum + s.total_processed, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.reduce((sum, s) => sum + s.leads_created, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Leads Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.length > 0 
                      ? (stats.reduce((sum, s) => sum + s.success_rate, 0) / stats.length).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.length > 0 
                      ? (stats.reduce((sum, s) => sum + s.avg_confidence, 0) / stats.length * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Processing</CardTitle>
              <CardDescription>
                Latest emails processed by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProcessing.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getSourceIcon(item.processing_source)}
                          <span className="text-sm font-medium">
                            {item.processing_source.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.from}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {item.subject}
                      </TableCell>
                      <TableCell>
                        <Badge className={getConfidenceColor(item.ai_confidence || 0)}>
                          {getConfidenceLabel(item.ai_confidence || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.processed_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analysis by processing source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Avg Confidence</TableHead>
                    <TableHead>High Confidence %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat) => (
                    <TableRow key={stat.processing_source}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getSourceIcon(stat.processing_source)}
                          <span className="font-medium">
                            {stat.processing_source.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{stat.total_processed}</TableCell>
                      <TableCell>{stat.leads_created}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {stat.success_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(stat.avg_confidence * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {stat.high_confidence_rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 