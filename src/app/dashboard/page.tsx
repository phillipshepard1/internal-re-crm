'use client'

import { useState, useEffect, useCallback } from 'react'
import { User, Clock, CheckCircle, Activity } from 'lucide-react'
import { getPeople, getFollowUps, getTasks, getRecentActivities, getUserRecentActivities } from '@/lib/database'
import type { Person, FollowUpWithPerson, Task, Activity as ActivityType } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDataLoader } from '@/hooks/useDataLoader'
import { HomeStackSSOButton } from '@/components/integrations/HomeStackSSOButton'

interface DashboardStats {
  totalPeople: number
  totalLeads: number
  totalFollowUps: number
  totalTasks: number
}

interface ActivityWithDetails {
  id: string
  person_id: string
  type: 'created' | 'follow_up' | 'note_added' | 'task_added' | 'assigned' | 'status_changed'
  description: string
  created_by: string
  created_at: string
  people?: {
    id: string
    first_name: string
    last_name: string
    assigned_to: string
  }
}

// Move loadFunction outside component to prevent recreation on every render
const loadDashboardData = async (userId: string, userRole: string) => {
  // Use appropriate activities function based on user role
  const activitiesFunction = userRole === 'admin' ? getRecentActivities : getUserRecentActivities
  const activitiesLimit = userRole === 'admin' ? 20 : 20
  
  const [people, followUps, tasks, activities] = await Promise.all([
    getPeople(userId, userRole),
    getFollowUps(userId, userRole),
    getTasks(undefined, userId, userRole),
    userRole === 'admin' 
      ? getRecentActivities(activitiesLimit)
      : getUserRecentActivities(userId, activitiesLimit)
  ])
  
  return {
    people,
    followUps,
    tasks,
    activities
  }
}

export default function DashboardPage() {
  const { user, userRole } = useAuth()

  // Debug auth state
  useEffect(() => {
    console.log('Dashboard: Auth state changed', {
      hasUser: !!user,
      hasUserRole: !!userRole,
      userRole,
      userId: user?.id
    })
  }, [user, userRole])

  // Component lifecycle management

  // Use the robust data loader for all dashboard data
  const { data: dashboardData, loading, error, refetch } = useDataLoader(
    loadDashboardData,
    {
      cacheKey: userRole ? `dashboard_data_${userRole}` : 'dashboard_data_loading',
      cacheTimeout: 2 * 60 * 1000, // 2 minutes cache
      enabled: !!user && !!userRole, // Only load when both user and role are available
      dependencies: [userRole] // Refetch when user role changes
    }
  )

  const myPeople = dashboardData?.people || []
  const myFollowUps = dashboardData?.followUps || []
  const myTasks = dashboardData?.tasks || []
  const recentActivities = dashboardData?.activities || []

  // Show loading when auth is still loading, data is loading, or user/role not ready
  const isLoading = !user || !userRole || loading
  
  // Debug loading state
  useEffect(() => {
    if (isLoading) {
      console.log('Dashboard: Showing loading state', {
        hasUser: !!user,
        hasUserRole: !!userRole,
        dataLoading: loading,
        userRole,
        userId: user?.id
      })
    }
  }, [isLoading, user, userRole, loading])
  
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {!user || !userRole ? 'Setting up your account...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const myLeads = myPeople.filter((p: Person) => p.client_type === 'lead')
  const pendingFollowUps = myFollowUps.filter((f: FollowUpWithPerson) => f.status === 'pending')
  const overdueFollowUps = pendingFollowUps.filter((f: FollowUpWithPerson) => new Date(f.scheduled_date) < new Date())
  const pendingTasks = myTasks.filter((t: Task) => t.status === 'pending')

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your leads and contacts.
          </p>
        </div>
        <HomeStackSSOButton variant="outline" size="sm">
          Go to HomeStack
        </HomeStackSSOButton>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My People</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myPeople.length}</div>
            <p className="text-xs text-muted-foreground">
              {myLeads.length} leads, {myPeople.length - myLeads.length} clients
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFollowUps.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueFollowUps.length} overdue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Tasks to complete
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivities.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>
            Your latest interactions and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity: ActivityWithDetails) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Badge variant={
                        activity.type === 'created' ? 'default' :
                        activity.type === 'follow_up' ? 'secondary' :
                        activity.type === 'note_added' ? 'outline' :
                        activity.type === 'task_added' ? 'secondary' :
                        activity.type === 'assigned' ? 'default' :
                        activity.type === 'status_changed' ? 'outline' :
                        'secondary'
                      }>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.people ? `${activity.people.first_name} ${activity.people.last_name}` : 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {activity.description}
                    </TableCell>
                    <TableCell>
                      {new Date(activity.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <AlertDescription>No recent activities found.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overdue Follow-ups</CardTitle>
            <CardDescription>
              Follow-ups that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueFollowUps.length > 0 ? (
              <div className="space-y-2">
                {overdueFollowUps.slice(0, 5).map((followUp: FollowUpWithPerson) => (
                  <div key={followUp.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">
                        {followUp.people ? `${followUp.people.first_name} ${followUp.people.last_name}` : 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {followUp.type} - {new Date(followUp.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Overdue</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>No overdue follow-ups!</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>
              Tasks that need completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.length > 0 ? (
              <div className="space-y-2">
                {pendingTasks.slice(0, 5).map((task: Task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>No pending tasks!</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 