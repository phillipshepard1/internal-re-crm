'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Calendar, 
  CheckSquare, 
  FileText, 
  TrendingUp, 
  Clock,
  User,
  Building
} from 'lucide-react'
import Link from 'next/link'
import { getPeople, getFollowUps, getTasks, getNotes } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user, userRole } = useAuth()
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalFollowUps: 0,
    totalTasks: 0,
    totalNotes: 0,
    overdueFollowUps: 0,
    pendingTasks: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [user, userRole])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load data with error handling for each call
      let people = []
      let followUps = []
      let tasks = []
      let notes = []

      try {
        people = await getPeople(user?.id, userRole || undefined)
      } catch (err) {
        console.error('Error loading people:', err)
      }

      try {
        followUps = await getFollowUps(user?.id, userRole || undefined)
      } catch (err) {
        console.error('Error loading follow-ups:', err)
      }

      try {
        tasks = await getTasks(undefined, user?.id, userRole || undefined)
      } catch (err) {
        console.error('Error loading tasks:', err)
      }

      try {
        notes = await getNotes()
      } catch (err) {
        console.error('Error loading notes:', err)
      }

      const now = new Date()
      const overdueFollowUps = followUps.filter(followUp => 
        followUp.scheduled_date && new Date(followUp.scheduled_date) < now
      ).length

      const pendingTasks = tasks.filter(task => 
        task.status === 'pending'
      ).length

      setStats({
        totalPeople: people.length,
        totalFollowUps: followUps.length,
        totalTasks: tasks.length,
        totalNotes: notes.length,
        overdueFollowUps,
        pendingTasks
      })
    } catch (err: any) {
      console.error('Dashboard error details:', err)
      setError(`Failed to load dashboard data: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your CRM activity.
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your CRM activity.
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          <Button onClick={loadDashboardData} className="mt-4">
            Try Again
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your CRM activity.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {userRole === 'admin' ? 'Administrator' : 'Agent'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total People</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPeople}</div>
              <p className="text-xs text-muted-foreground">
                Contacts in your CRM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFollowUps}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueFollowUps > 0 && (
                  <span className="text-destructive">
                    {stats.overdueFollowUps} overdue
                  </span>
                )}
                {stats.overdueFollowUps === 0 && 'All up to date'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingTasks} pending tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotes}</div>
              <p className="text-xs text-muted-foreground">
                Total notes created
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild className="h-20 flex-col">
                      <Link href="/people/new">
                        <User className="h-6 w-6 mb-2" />
                        Add Person
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new contact to your CRM</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild className="h-20 flex-col">
                      <Link href="/follow-ups">
                        <Calendar className="h-6 w-6 mb-2" />
                        Schedule Follow-up
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Schedule a new follow-up activity</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild className="h-20 flex-col">
                      <Link href="/tasks">
                        <CheckSquare className="h-6 w-6 mb-2" />
                        Create Task
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new task</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild className="h-20 flex-col">
                      <Link href="/notes">
                        <FileText className="h-6 w-6 mb-2" />
                        Add Note
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new note</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest CRM activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dashboard loaded</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="h-2 w-2 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Welcome to your CRM</p>
                    <p className="text-xs text-muted-foreground">
                      Get started by adding your first contact
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {userRole === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>
                Administrative tools and system management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild>
                      <Link href="/admin">
                        <Building className="mr-2 h-4 w-4" />
                        Access Admin Panel
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage users, settings, and system configuration</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
} 