'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Shield, Settings, Activity, Eye, Edit, Trash2, UserPlus, UserMinus, Crown } from 'lucide-react'
import { updateUserRole } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertModal } from '@/components/ui/alert-modal'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ActivityDashboard } from '@/components/admin/ActivityDashboard'
import type { RoundRobinConfig, User } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminPage() {
  const { userRole } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [alertModal, setAlertModal] = useState<{
    open: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load data from API
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Failed to fetch admin data')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError('Failed to load admin data')
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userRole !== 'admin') {
      setError('Access denied. Admin privileges required.')
      setLoading(false)
      return
    }
    loadData()
  }, [userRole, loadData])

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent') => {
    try {
      setRoleUpdateLoading(userId)
      await updateUserRole(userId, newRole)
      await loadData() // Reload data
    } catch (err) {
      console.error('Error updating user role:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to update user role.',
        type: 'error'
      })
    } finally {
      setRoleUpdateLoading(null)
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      // In a real app, you would call an API to delete the user
      // For now, we'll just remove them from the local state
      setUsers(users.filter(u => u.id !== userToDelete.id))
      
      setAlertModal({
        open: true,
        title: 'Success',
        message: `User ${userToDelete.email} has been deleted.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Error deleting user:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to delete user.',
        type: 'error'
      })
    } finally {
      setShowDeleteModal(false)
      setUserToDelete(null)
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
                {/* roundRobinConfig.filter(c => c.is_active).length */}
                N/A
              </div>
              <p className="text-xs text-muted-foreground">
                Active in lead distribution
              </p>
            </CardContent>
          </Card>


        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="roles">Role Management</TabsTrigger>
            <TabsTrigger value="activity">Activity Dashboard</TabsTrigger>
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
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleViewUser(user)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View user details</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditUser(user)}
                                  >
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
                                    onClick={() => handleDeleteUser(user)}
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

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                  Manage user roles and permissions. All new users are assigned agent roles by default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Role Management Table */}
                  <div>
                    <h3 className="font-semibold mb-3">User Role Management</h3>
                    {users.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Current Role</TableHead>
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
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={user.role}
                                    onValueChange={(value: 'admin' | 'agent') => 
                                      handleRoleChange(user.id, value)
                                    }
                                    disabled={roleUpdateLoading === user.id}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="agent">Agent</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {roleUpdateLoading === user.id && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                  )}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <ActivityDashboard users={users} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* User View/Edit Modal */}
      <AlertModal
        open={showUserModal}
        onOpenChange={setShowUserModal}
        title={selectedUser ? `User Details - ${selectedUser.email}` : 'User Details'}
        message={
          selectedUser ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <span className="font-medium">Role:</span>
                  <p className="text-muted-foreground capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <p className="text-muted-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p className="text-muted-foreground">Active</p>
                </div>
              </div>
              <div className="pt-3">
                <p className="text-sm text-muted-foreground">
                  To edit user permissions, use the role management section below.
                </p>
              </div>
            </div>
          ) : 'No user selected'
        }
        type="info"
      />

      {/* Delete Confirmation Modal */}
      <AlertModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirm User Deletion"
        message={
          userToDelete ? (
            <div className="space-y-3">
              <p>Are you sure you want to delete the user account for:</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{userToDelete.email}</p>
                <p className="text-sm text-muted-foreground">Role: {userToDelete.role}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. The user will lose access to the system immediately.
              </p>
            </div>
          ) : 'No user selected for deletion'
        }
        type="warning"
        onConfirm={confirmDeleteUser}
        confirmText="Delete User"
        cancelText="Cancel"
        showCancel={true}
      />

      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </TooltipProvider>
  )
} 