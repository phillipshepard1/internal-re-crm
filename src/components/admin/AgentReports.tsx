'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Activity, CheckCircle, XCircle, FileText, Clock, TrendingUp, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDataLoader } from '@/hooks/useDataLoader'
import { getAgentReports } from '@/lib/database'

interface User {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role: 'admin' | 'agent'
}

interface AgentReportsProps {
  users: User[]
}

interface AgentReport {
  userId: string
  userEmail: string
  userName: string
  activities: Array<{
    id: string
    type: string
    description: string
    created_at: string
    person_name?: string
  }>
  followUps: Array<{
    id: string
    type: string
    status: string
    scheduled_date: string
    completed_date?: string
    person_name?: string
  }>
  missedFollowUps: Array<{
    id: string
    type: string
    scheduled_date: string
    person_name?: string
  }>
  notes: Array<{
    id: string
    title: string
    content: string
    created_at: string
    person_name?: string
  }>
  stats: {
    totalActivities: number
    totalFollowUps: number
    completedFollowUps: number
    missedFollowUps: number
    totalNotes: number
  }
}

export function AgentReports({ users }: AgentReportsProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<AgentReport | null>(null)

  // Set default date range to previous week
  useEffect(() => {
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    if (!startDate) {
      setStartDate(lastWeek.toISOString().split('T')[0])
    }
    if (!endDate) {
      setEndDate(now.toISOString().split('T')[0])
    }
  }, [startDate, endDate])

  // Filter users to show only agents
  const agents = users.filter(user => user.role === 'agent')

  const generateReport = async () => {
    if (!selectedAgent || !startDate || !endDate) {
      return
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      alert('Please enter dates in YYYY-MM-DD format')
      return
    }

    try {
      setLoading(true)
      const reportData = await getAgentReports(selectedAgent, startDate, endDate)
      setReport(reportData)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAgentName = (userId: string) => {
    const agent = agents.find(a => a.id === userId)
    return agent ? (agent.first_name && agent.last_name ? `${agent.first_name} ${agent.last_name}` : agent.email) : 'Unknown'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <User className="h-4 w-4" />
      case 'follow_up':
        return <CheckCircle className="h-4 w-4" />
      case 'note_added':
        return <FileText className="h-4 w-4" />
      case 'task_added':
        return <CheckCircle className="h-4 w-4" />
      case 'assigned':
        return <User className="h-4 w-4" />
      case 'status_changed':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityBadgeVariant = (type: string) => {
    switch (type) {
      case 'created':
        return 'default'
      case 'follow_up':
        return 'secondary'
      case 'note_added':
        return 'outline'
      case 'task_added':
        return 'secondary'
      case 'assigned':
        return 'default'
      case 'status_changed':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agent Reports</h2>
        <p className="text-muted-foreground">
          Generate detailed activity reports for agents with customizable date ranges
        </p>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Report Settings
          </CardTitle>
          <CardDescription>
            Select an agent and date range to generate a detailed activity report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.first_name && agent.last_name 
                        ? `${agent.first_name} ${agent.last_name}` 
                        : agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <Button 
            onClick={generateReport} 
            disabled={!selectedAgent || !startDate || !endDate || loading}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Report...
              </>
            ) : (
              <>
                <CalendarDays className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalActivities}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalFollowUps}</div>
                <p className="text-xs text-muted-foreground">
                  {report.stats.completedFollowUps} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Missed Follow-ups</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{report.stats.missedFollowUps}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notes Added</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.stats.totalNotes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.stats.totalFollowUps > 0 
                    ? Math.round((report.stats.completedFollowUps / report.stats.totalFollowUps) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Sections */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  All Activities ({report.activities.length})
                </CardTitle>
                <CardDescription>
                  All activities performed by {getAgentName(report.userId)} during the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.activities.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {report.activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={getActivityBadgeVariant(activity.type)}>
                              {activity.type.replace('_', ' ')}
                            </Badge>
                            {activity.person_name && (
                              <span className="text-sm font-medium text-muted-foreground">
                                {activity.person_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No activities found for this period.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Follow-ups ({report.followUps.length})
                </CardTitle>
                <CardDescription>
                  All follow-ups scheduled and completed during the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.followUps.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {report.followUps.map((followUp) => (
                      <div key={followUp.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          <CheckCircle className={`h-4 w-4 ${followUp.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={followUp.status === 'completed' ? 'default' : 'secondary'}>
                              {followUp.status}
                            </Badge>
                            <Badge variant="outline">{followUp.type}</Badge>
                            {followUp.person_name && (
                              <span className="text-sm font-medium text-muted-foreground">
                                {followUp.person_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Scheduled: {formatDate(followUp.scheduled_date)}
                            {followUp.completed_date && (
                              <span className="ml-2">• Completed: {formatDate(followUp.completed_date)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No follow-ups found for this period.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Missed Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <XCircle className="mr-2 h-5 w-5" />
                  Missed Follow-ups ({report.missedFollowUps.length})
                </CardTitle>
                <CardDescription>
                  Follow-ups that were scheduled but not completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.missedFollowUps.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {report.missedFollowUps.map((followUp) => (
                      <div key={followUp.id} className="flex items-start space-x-3 p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                        <div className="flex-shrink-0 mt-1">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="destructive">Missed</Badge>
                            <Badge variant="outline">{followUp.type}</Badge>
                            {followUp.person_name && (
                              <span className="text-sm font-medium text-muted-foreground">
                                {followUp.person_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Was due: {formatDate(followUp.scheduled_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No missed follow-ups found for this period.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Notes Added ({report.notes.length})
                </CardTitle>
                <CardDescription>
                  All notes added during the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.notes.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {report.notes.map((note) => (
                      <div key={note.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline">Note</Badge>
                            {note.person_name && (
                              <span className="text-sm font-medium text-muted-foreground">
                                {note.person_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{note.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {note.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(note.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No notes found for this period.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* No Report Generated */}
      {!report && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
            <p className="text-muted-foreground text-center">
              Select an agent and date range above, then click "Generate Report" to view detailed activity data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 