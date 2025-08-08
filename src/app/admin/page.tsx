'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Shield, Settings, Activity, Eye, Edit, Trash2, UserPlus, UserMinus, Crown, Archive, RotateCcw } from 'lucide-react'
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
import { LeadStaging } from '@/components/admin/LeadStaging'
import { LeadSourceManagement } from '@/components/admin/LeadSourceManagement'
import { FollowUpFrequencyManagement } from '@/components/admin/FollowUpFrequencyManagement'
import { AgentReports } from '@/components/admin/AgentReports'
import { TrackingPixelDashboard } from '@/components/admin/TrackingPixel'
import type { RoundRobinConfig, User } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AdminPage() {
  const { userRole } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
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
  const [showArchivedUsers, setShowArchivedUsers] = useState(false)



  // Get the active tab from URL params, default to 'leads' instead of 'users'
  const activeTab = searchParams.get('tab') || 'leads'

  // Function to update URL with current tab
  const updateTabInUrl = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const loadData = useCallback(async (includeArchived = false) => {
    try {
      setLoading(true)
      setError('')
      
      // Load data from API
      const url = includeArchived 
        ? '/api/admin/users?includeArchived=true'
        : '/api/admin/users'
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch admin data')
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError('Failed to load admin data')
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
    loadData(showArchivedUsers)
  }, [userRole, showArchivedUsers])

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent') => {
    try {
      setRoleUpdateLoading(userId)
      await updateUserRole(userId, newRole)
      await loadData(showArchivedUsers) // Reload data
    } catch (err) {
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

  const handleArchiveUser = (user: User) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmArchiveUser = async () => {
    if (!userToDelete) return

    try {
      setDeleteLoading(true)
      
      // Call the API to archive the user
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: userToDelete.id,
          action: 'archive',
          archivedBy: userToDelete.id // This should be the current admin's ID
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to archive user')
      }

      const result = await response.json()
      
      // Update local state to mark user as archived
      setUsers(users.map(u => 
        u.id === userToDelete.id 
          ? { ...u, status: 'archived', archived_at: new Date().toISOString() }
          : u
      ))
      
      setAlertModal({
        open: true,
        title: 'Success',
        message: result.message || `User ${userToDelete.email} has been archived successfully.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Error archiving user:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to archive user.',
        type: 'error'
      })
    } finally {
      setDeleteLoading(false)
      setShowDeleteModal(false)
      setUserToDelete(null)
    }
  }

  const handleRestoreUser = async (user: User) => {
    try {
      setRoleUpdateLoading(user.id)
      
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          action: 'restore'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore user')
      }

      const result = await response.json()
      
      // Update local state to mark user as active
      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, status: 'active', archived_at: null, archived_by: null }
          : u
      ))
      
      setAlertModal({
        open: true,
        title: 'Success',
        message: result.message || `User ${user.email} has been restored successfully.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Error restoring user:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to restore user.',
        type: 'error'
      })
    } finally {
      setRoleUpdateLoading(null)
    }
  }



  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage system settings and user access
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          {userRole === 'admin' && (
            <Button onClick={() => loadData(showArchivedUsers)} className="mt-4">
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">
                Active system users
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
                {users.filter(u => u.role === 'admin' && u.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active users with admin access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Archived Users</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.status === 'archived').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Archived user accounts
              </p>
            </CardContent>
          </Card>

        </div>

        <Tabs value={activeTab} onValueChange={updateTabInUrl} className="space-y-4">
          <div className="relative w-full">
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin tabs-mobile-scroll">
              <TabsList className="w-full md:w-auto flex flex-nowrap md:flex-wrap justify-start md:justify-center min-w-max bg-muted/50">
                <TabsTrigger value="leads" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Lead Staging</TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">User Mgmt</TabsTrigger>
                <TabsTrigger value="roles" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Roles</TabsTrigger>
                <TabsTrigger value="sources" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Lead Sources</TabsTrigger>
                {/* <TabsTrigger value="plans" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Follow-up Plans</TabsTrigger> */}
                <TabsTrigger value="activity" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Activity</TabsTrigger>
                <TabsTrigger value="reports" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Reports</TabsTrigger>
                <TabsTrigger value="pixel" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">Tracking Pixel</TabsTrigger>
              </TabsList>
            </div>
            {/* Mobile scroll indicator */}
            <div className="md:hidden absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
          
          <TabsContent value="leads" className="space-y-4">
            <LeadStaging users={users} />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-archived"
                      checked={showArchivedUsers}
                      onCheckedChange={setShowArchivedUsers}
                    />
                    <label htmlFor="show-archived" className="text-sm font-medium">
                      Show archived users
                    </label>
                  </div>
                </div>

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
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status === 'active' ? 'Active' : 'Archived'}
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
                              {user.status === 'active' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleArchiveUser(user)}
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Archive user account</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => handleRestoreUser(user)}
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Restore user account</p>
                                  </TooltipContent>
                                </Tooltip>
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
                    {users.filter(user => user.status === 'active').length > 0 ? (
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
                          {users.filter(user => user.status === 'active').map((user) => (
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

          <TabsContent value="sources" className="space-y-4">
            <LeadSourceManagement />
          </TabsContent>

          {/* <TabsContent value="plans" className="space-y-4">
            <FollowUpFrequencyManagement users={users} />
          </TabsContent> */}

          <TabsContent value="reports" className="space-y-4">
            <AgentReports users={users} />
          </TabsContent>

          <TabsContent value="pixel" className="space-y-4">
            <TrackingPixelDashboard />
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
                  <p className="text-muted-foreground capitalize">{selectedUser.status}</p>
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

      {/* Archive Confirmation Modal */}
      <AlertModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirm User Archive"
        message={
          userToDelete ? (
            <div className="space-y-3">
              <p>Are you sure you want to archive the user account for:</p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{userToDelete.email}</p>
                <p className="text-sm text-muted-foreground">Role: {userToDelete.role}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                The user will lose access to the system immediately, but their data will be preserved. You can restore them later if needed.
              </p>
              {deleteLoading && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Archiving user...</span>
                </div>
              )}
            </div>
          ) : 'No user selected for archiving'
        }
        type="warning"
        onConfirm={confirmArchiveUser}
        confirmText={deleteLoading ? "Archiving..." : "Archive User"}
        cancelText="Cancel"
        showCancel={true}
        disabled={deleteLoading}
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