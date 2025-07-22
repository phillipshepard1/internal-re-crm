'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User, Users, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { getStagingLeads, getAssignedLeads, getUsersForAssignment, assignLeadToUser, updateLeadStatus, getLeadStats } from '@/lib/database'
import type { Person } from '@/lib/supabase'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'
import Link from 'next/link'

// Load functions
const loadStagingLeads = async () => {
  return await getStagingLeads()
}

const loadAssignedLeads = async (userId: string, userRole: string) => {
  return await getAssignedLeads(userId, userRole)
}

const loadUsersForAssignment = async (userId: string, userRole: string) => {
  return await getUsersForAssignment()
}

export default function LeadsPage() {
  const { user, userRole } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [leadStats, setLeadStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [assigningLead, setAssigningLead] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('staging')
  const [openStatusDialog, setOpenStatusDialog] = useState<string | null>(null)
  const itemsPerPage = 10

  // Define loadStats function before it's used
  const loadStats = async () => {
    try {
      const stats = await getLeadStats(user?.id, user?.role)
      setLeadStats(stats)
    } catch (error) {
      // Error loading stats
    }
  }

  // Data loaders - these must be called before any conditional returns
  const {
    data: stagingLeads,
    loading: stagingLoading,
    error: stagingError,
    refetch: refetchStaging
  } = useDataLoader(loadStagingLeads, {})

  const {
    data: assignedLeads,
    loading: assignedLoading,
    error: assignedError,
    refetch: refetchAssigned
  } = useDataLoader(loadAssignedLeads, {})

  const {
    data: assignmentUsers,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useDataLoader(loadUsersForAssignment, {})

  // Set active tab based on user role after hooks are called
  useEffect(() => {
    if (userRole) {
      setActiveTab(userRole === 'admin' ? 'staging' : 'assigned')
    }
  }, [userRole])

  // Debug assigned leads
  useEffect(() => {
    if (assignedLeads) {
      // console.log('📋 Assigned leads loaded:', {
      //   totalLeads: assignedLeads.length,
      //   userRole: userRole,
      //   userId: user?.id,
      //   leads: assignedLeads.map((lead: Person) => ({
      //     id: lead.id,
      //     name: `${lead.first_name} ${lead.last_name}`,
      //     assigned_to: lead.assigned_to,
      //     assigned_user: lead.assigned_user
      //   }))
      // })
    }
  }, [assignedLeads, userRole, user?.id])

  // Reset to page 1 when switching tabs or changing search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm])

  // Load stats and users on mount
  useEffect(() => {
    loadStats()
    if (assignmentUsers) {
      // console.log('Users for assignment loaded:', assignmentUsers)
      setUsers(assignmentUsers)
    }
  }, [assignmentUsers])

  // Debug logging
  // console.log('🔍 Current user info:', {
  //   userId: user?.id,
  //   userEmail: user?.email,
  //   userRole: userRole,
  //   isAdmin: userRole === 'admin',
  //   isAgent: userRole === 'agent'
  // })

  // Check if user has access to leads page
  if (!user || !userRole) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only allow agents and admins to access leads page
  if (userRole !== 'admin' && userRole !== 'agent') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. You need agent or admin privileges to view leads.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Filter data based on search term
  const filteredStagingLeads = stagingLeads?.filter((lead: Person) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.phone?.some(phone => phone.includes(searchTerm))
  ) || []

  const filteredAssignedLeads = assignedLeads?.filter((lead: Person) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.phone?.some(phone => phone.includes(searchTerm))
  ) || []

  // Paginate data
  const paginatedStagingLeads = filteredStagingLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedAssignedLeads = filteredAssignedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const createTestAgent = async () => {
    try {
      const response = await fetch('/api/admin/create-test-agent', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh the page to reload users
        window.location.reload()
      } else {
        // console.error('Failed to create test agent:', result.error)
      }
    } catch (error) {
      // console.error('Error creating test agent:', error)
    }
  }

  const createMissingUsers = async () => {
    try {
      const response = await fetch('/api/admin/create-missing-users', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh the page to reload users
        window.location.reload()
      } else {
        // console.error('Failed to create missing users:', result.error)
      }
    } catch (error) {
      // console.error('Error creating missing users:', error)
    }
  }

  const checkUsersTable = async () => {
    try {
      const response = await fetch('/api/admin/check-users-table')
      const result = await response.json()
      // console.log('Users table check:', result)
      // alert(`Users table status: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      // console.error('Error checking users table:', error)
    }
  }

  const handleAssignLead = async (leadId: string) => {
    if (!selectedUserId) return

    try {
      setAssigningLead(leadId)
      await assignLeadToUser(leadId, selectedUserId)
      setSelectedUserId('')
      refetchStaging()
      refetchAssigned()
      loadStats()
    } catch (error) {
      // console.error('Error assigning lead:', error)
    } finally {
      setAssigningLead(null)
    }
  }

  const handleUpdateStatus = async (leadId: string) => {
    if (!selectedStatus) return

    try {
      setUpdatingStatus(leadId)
      await updateLeadStatus(leadId, selectedStatus as any, user?.id || '')
      setSelectedStatus('')
      setOpenStatusDialog(null)
      refetchStaging()
      refetchAssigned()
      loadStats()
    } catch (error) {
      // console.error('Error updating status:', error)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleOpenStatusDialog = (leadId: string, currentStatus: string) => {
    setOpenStatusDialog(leadId)
    setSelectedStatus(currentStatus)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      staging: { variant: 'secondary' as const, icon: AlertCircle, label: 'Staging' },
      assigned: { variant: 'default' as const, icon: User, label: 'Assigned' },
      contacted: { variant: 'default' as const, icon: Phone, label: 'Contacted' },
      qualified: { variant: 'default' as const, icon: Target, label: 'Qualified' },
      converted: { variant: 'default' as const, icon: CheckCircle, label: 'Converted' },
      lost: { variant: 'destructive' as const, icon: XCircle, label: 'Lost' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.staging
    const Icon = config.icon

    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getLeadSourceBadge = (source: string) => {
    const sourceConfig = {
      homestack: { variant: 'outline' as const, label: 'HomeStack' },
      homestack_mobile: { variant: 'outline' as const, label: 'HomeStack Mobile' },
      email: { variant: 'outline' as const, label: 'Email' },
      zapier: { variant: 'outline' as const, label: 'Zapier' }
    }

    const config = sourceConfig[source as keyof typeof sourceConfig] || { variant: 'outline' as const, label: source }

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">
            Manage and assign leads from various sources
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.location.href = '/people/new'}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {leadStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staging</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.staging}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.assigned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacted</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.contacted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Qualified</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.qualified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.converted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadStats.lost}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {user?.role === 'admin' && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name || user.email.split('@')[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {/* Only admins can see staging leads */}
          {userRole === 'admin' && (
            <TabsTrigger value="staging">Staging ({leadStats?.staging || 0})</TabsTrigger>
          )}
          <TabsTrigger value="assigned">
            {userRole === 'admin' ? 'Assigned Leads' : 'My Leads'} ({leadStats?.assigned || 0})
          </TabsTrigger>
        </TabsList>

        {/* Staging Tab */}
        <TabsContent value="staging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staging Leads</CardTitle>
              <CardDescription>
                New leads waiting to be assigned to agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stagingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading staging leads...</div>
                </div>
              ) : stagingError ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Error loading staging leads</AlertDescription>
                </Alert>
              ) : paginatedStagingLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No staging leads found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStagingLeads.map((lead: Person) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            <Link 
                              href={`/people/${lead.id}`}
                              className="hover:underline text-primary"
                            >
                              {lead.first_name} {lead.last_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && lead.email[0] && (
                                <div className="flex items-center text-sm">
                                  <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {lead.email[0]}
                                </div>
                              )}
                              {lead.phone && lead.phone[0] && (
                                <div className="flex items-center text-sm">
                                  <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {lead.phone[0]}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getLeadSourceBadge(lead.lead_source || 'unknown')}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(lead.lead_status || 'staging')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-2 h-3 w-3" />
                              {new Date(lead.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {/* Only admins can assign leads */}
                            {userRole === 'admin' ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Assign
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Assign Lead</DialogTitle>
                                    <DialogDescription>
                                      Assign {lead.first_name} {lead.last_name} to an agent
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Select Agent</label>
                                      {users.length > 0 ? (
                                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Choose an agent" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {users.map((user) => (
                                              <SelectItem key={user.id} value={user.id}>
                                                {user.first_name && user.last_name 
                                                  ? `${user.first_name} ${user.last_name} (${user.role})`
                                                  : `${user.email} (${user.role})`
                                                }
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">No agents available for assignment.</p>
                                          <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={createTestAgent}
                                          >
                                            Create Test Agent
                                          </Button>
                                          <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={createMissingUsers}
                                          >
                                            Create Missing Users
                                          </Button>
                                          <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={checkUsersTable}
                                          >
                                            Check Users Table
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    <Button 
                                      onClick={() => handleAssignLead(lead.id)}
                                      disabled={!selectedUserId || assigningLead === lead.id}
                                      className="w-full"
                                    >
                                      {assigningLead === lead.id ? 'Assigning...' : 'Assign Lead'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-sm text-muted-foreground">Assigned to admin</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredStagingLeads.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    totalItems={filteredStagingLeads.length}
                    startIndex={(currentPage - 1) * itemsPerPage + 1}
                    endIndex={Math.min(currentPage * itemsPerPage, filteredStagingLeads.length)}
                    hasNextPage={currentPage < Math.ceil(filteredStagingLeads.length / itemsPerPage)}
                    hasPreviousPage={currentPage > 1}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Tab */}
        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{userRole === 'admin' ? 'Assigned Leads' : 'My Leads'}</CardTitle>
              <CardDescription>
                {userRole === 'admin' 
                  ? 'Leads that have been assigned to agents' 
                  : 'Your leads that are being worked on'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading assigned leads...</div>
                </div>
              ) : assignedError ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Error loading assigned leads</AlertDescription>
                </Alert>
              ) : paginatedAssignedLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assigned leads found
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last Contact</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAssignedLeads.map((lead: Person) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            <Link 
                              href={`/people/${lead.id}`}
                              className="hover:underline text-primary"
                            >
                              {lead.first_name} {lead.last_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {lead.assigned_user ? (
                              <div className="flex items-center">
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {lead.assigned_user.first_name || lead.assigned_user.email.split('@')[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(lead.lead_status || 'assigned')}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && lead.email[0] && (
                                <div className="flex items-center text-sm">
                                  <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {lead.email[0]}
                                </div>
                              )}
                              {lead.phone && lead.phone[0] && (
                                <div className="flex items-center text-sm">
                                  <Phone className="mr-2 h-3 w-3 text-muted-foreground" />
                                  {lead.phone[0]}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getLeadSourceBadge(lead.lead_source || 'unknown')}
                          </TableCell>
                          <TableCell>
                            {lead.last_interaction ? (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-2 h-3 w-3" />
                                {new Date(lead.last_interaction).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Dialog
                              open={openStatusDialog === lead.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setOpenStatusDialog(null)
                                  setSelectedStatus('')
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenStatusDialog(lead.id, lead.lead_status || 'assigned')}
                                >
                                  <TrendingUp className="mr-2 h-3 w-3" />
                                  Update Status
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Lead Status</DialogTitle>
                                  <DialogDescription>
                                    Current status: <strong>{lead.lead_status || 'assigned'}</strong><br />
                                    Update the status for {lead.first_name} {lead.last_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">New Status</label>
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="contacted">Contacted</SelectItem>
                                        <SelectItem value="qualified">Qualified</SelectItem>
                                        <SelectItem value="converted">Converted</SelectItem>
                                        <SelectItem value="lost">Lost</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button 
                                    onClick={() => handleUpdateStatus(lead.id)}
                                    disabled={!selectedStatus || updatingStatus === lead.id}
                                    className="w-full"
                                  >
                                    {updatingStatus === lead.id ? 'Updating...' : 'Update Status'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredAssignedLeads.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    totalItems={filteredAssignedLeads.length}
                    startIndex={(currentPage - 1) * itemsPerPage + 1}
                    endIndex={Math.min(currentPage * itemsPerPage, filteredAssignedLeads.length)}
                    hasNextPage={currentPage < Math.ceil(filteredAssignedLeads.length / itemsPerPage)}
                    hasPreviousPage={currentPage > 1}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  )
} 