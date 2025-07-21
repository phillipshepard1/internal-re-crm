'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { getAllActivities, getAdminDashboardStats } from '@/lib/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { User, RoundRobinConfig } from '@/lib/supabase'

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
  users?: {
    id: string
    email: string
  }
}

interface ActivityDashboardProps {
  users: User[]
}

export function ActivityDashboard({ users }: ActivityDashboardProps) {
  const [activities, setActivities] = useState<ActivityWithDetails[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [activitiesData, statsData] = await Promise.all([
          getAllActivities(50),
          getAdminDashboardStats()
        ])
        setActivities(activitiesData)
        setStats(statsData)
      } catch (err) {
        setError('Failed to load activity data')
        console.error('Error loading activity data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading activity dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Activity Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActivities || 0}</div>
            <p className="text-xs text-muted-foreground">
              All system activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentActivities || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingFollowUps || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled follow-ups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Follow-ups</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overdueFollowUps || 0}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activities</CardTitle>
          <CardDescription>
            Latest activities across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
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
                      {users.find(u => u.id === activity.created_by)?.email.split('@')[0] || 'Unknown'}
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

      {/* User Performance */}
      <Card>
        <CardHeader>
          <CardTitle>User Performance Metrics</CardTitle>
          <CardDescription>
            Performance statistics for each user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.userStats && stats.userStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned People</TableHead>
                  <TableHead>Assigned Leads</TableHead>
                  <TableHead>Completed Follow-ups</TableHead>
                  <TableHead>Pending Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.userStats.map((userStat: any) => (
                  <TableRow key={userStat.userId}>
                    <TableCell className="font-medium">
                      {userStat.email.split('@')[0]}
                    </TableCell>
                    <TableCell>
                      <Badge variant={userStat.role === 'admin' ? 'default' : 'secondary'}>
                        {userStat.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{userStat.assignedPeople}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{userStat.assignedLeads}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{userStat.completedFollowUps}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userStat.pendingTasks > 5 ? 'destructive' : 'outline'}>
                        {userStat.pendingTasks}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <AlertDescription>No user performance data available.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 