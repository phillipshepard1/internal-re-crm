'use client'

import { useState, useEffect } from 'react'
import { Users, Shield, Settings, Activity, Eye, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { getPeople, getUsers, getRoundRobinConfig, addUserToRoundRobin, removeUserFromRoundRobin, updateRoundRobinStatus } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import type { RoundRobinConfig, User } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminPage() {
  const { user, userRole } = useAuth()
  const [people, setPeople] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [roundRobinConfig, setRoundRobinConfig] = useState<RoundRobinConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userRole !== 'admin') {
      setError('Access denied. Admin privileges required.')
      setLoading(false)
      return
    }
    loadData()
  }, [user, userRole])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load people data
      let peopleData = []
      try {
        peopleData = await getPeople(user?.id, userRole || undefined)
      } catch (err) {
        console.error('Error loading people:', err)
      }
      
      // Load users data
      let usersData = []
      try {
        usersData = await getUsers()
      } catch (err) {
        console.error('Error loading users:', err)
      }
      
      // Load round robin config data
      let roundRobinData = []
      try {
        roundRobinData = await getRoundRobinConfig()
      } catch (err) {
        console.error('Error loading round robin config:', err)
        // Show a helpful message instead of failing
        setError('Round Robin configuration is not available. The database table may need to be set up.')
      }
      
      setPeople(peopleData)
      setUsers(usersData)
      setRoundRobinConfig(roundRobinData)
    } catch (err) {
      setError('Failed to load admin data')
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToRoundRobin = async (userId: string) => {
    try {
      await addUserToRoundRobin(userId)
      await loadData() // Reload data
    } catch (err) {
      console.error('Error adding user to Round Robin:', err)
      alert('Failed to add user to Round Robin. The Round Robin table may not exist yet.')
    }
  }

  const handleRemoveFromRoundRobin = async (userId: string) => {
    try {
      await removeUserFromRoundRobin(userId)
      await loadData() // Reload data
    } catch (err) {
      console.error('Error removing user from Round Robin:', err)
      alert('Failed to remove user from Round Robin. The Round Robin table may not exist yet.')
    }
  }

  const handleToggleRoundRobinStatus = async (userId: string, isActive: boolean) => {
    try {
      await updateRoundRobinStatus(userId, isActive)
      await loadData() // Reload data
    } catch (err) {
      console.error('Error updating Round Robin status:', err)
      alert('Failed to update Round Robin status. The Round Robin table may not exist yet.')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-muted-foreground">
              Manage system settings and user access
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-muted-foreground">
              Manage system settings and user access
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          {userRole === 'admin' && (
            <Button onClick={loadData} className="mt-4">
              Try Again
            </Button>
          )}
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-muted-foreground">
              Manage system settings and user access
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/create-user">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create new user accounts</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/test-leads">
                    <Users className="mr-2 h-4 w-4" />
                    Test Leads
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Test Round Robin lead assignment</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/admin/integrations">
                    <Settings className="mr-2 h-4 w-4" />
                    Integrations
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage lead integrations</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Admin Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                All system users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Users with admin access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Round Robin Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roundRobinConfig.filter(c => c.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active in lead distribution
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Online</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="roundRobin">Round Robin</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
            <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.email.split('@')[0]}
                          </TableCell>
                          <TableCell>
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View user details</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit user permissions</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete user account</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>No users found in the system.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="roundRobin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Round Robin Lead Distribution</CardTitle>
                <CardDescription>
                  Configure which users receive leads automatically via Round Robin assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.filter(u => u.role !== 'admin').length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Round Robin Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users
                        .filter(u => u.role !== 'admin') // Only show non-admin users
                        .map((user) => {
                          const roundRobinEntry = roundRobinConfig.find(c => c.user_id === user.id)
                          const isInRoundRobin = !!roundRobinEntry
                          const isActive = roundRobinEntry?.is_active ?? false
                          
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.email.split('@')[0]}
                              </TableCell>
                              <TableCell>
                                {user.email}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={isActive}
                                    onCheckedChange={(checked) => {
                                      if (isInRoundRobin) {
                                        handleToggleRoundRobinStatus(user.id, checked)
                                      } else {
                                        handleAddToRoundRobin(user.id)
                                      }
                                    }}
                                  />
                                  <Badge variant={isActive ? 'default' : 'secondary'}>
                                    {isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {isInRoundRobin ? roundRobinEntry.priority : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {isInRoundRobin ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveFromRoundRobin(user.id)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <UserMinus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Remove from Round Robin</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAddToRoundRobin(user.id)}
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Add to Round Robin</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertDescription>No agent users found. Add agent users to configure Round Robin distribution.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            <Alert>
              <AlertDescription>
                System settings configuration coming soon! This will allow you to configure global settings, integrations, and system preferences.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <Alert>
              <AlertDescription>
                Activity logs feature coming soon! This will show detailed logs of user actions, system events, and security activities.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
} 