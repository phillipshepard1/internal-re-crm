'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, User, Target, Calendar, Phone, Mail, Eye, UserPlus, Clock, AlertCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getStagingLeads, getAssignedLeads, getFollowUpPlanTemplates } from '@/lib/database'
import type { Person, FollowUpPlanTemplate } from '@/lib/supabase'
import { formatPhoneNumberForDisplay } from '@/lib/utils'
import { useDataLoader } from '@/hooks/useDataLoader'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role: 'admin' | 'agent'
}

interface LeadStagingProps {
  users: User[]
}

export function LeadStaging({ users }: LeadStagingProps) {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get state from URL parameters
  const urlTab = searchParams.get('leadTab')
  const urlPage = searchParams.get('leadPage')
  const urlSearch = searchParams.get('leadSearch')
  
  const [searchTerm, setSearchTerm] = useState(urlSearch || '')
  const [activeTab, setActiveTab] = useState(urlTab || 'staging')
  const [currentPage, setCurrentPage] = useState(urlPage ? parseInt(urlPage) : 1)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Person | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedFrequency, setSelectedFrequency] = useState<'twice_week' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1) // Monday
  const [assigning, setAssigning] = useState(false)
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const itemsPerPage = 10

  // Filter users to show all users (agents and admins) so admins can assign leads to anyone including themselves
  const agents = users.filter(agent => agent.role === 'agent' || agent.role === 'admin')

  // Function to update URL with current state
  const updateUrlState = useCallback((updates: { tab?: string; page?: number; search?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (updates.tab !== undefined) {
      params.set('leadTab', updates.tab)
    }
    if (updates.page !== undefined) {
      params.set('leadPage', updates.page.toString())
    }
    if (updates.search !== undefined) {
      if (updates.search) {
        params.set('leadSearch', updates.search)
      } else {
        params.delete('leadSearch')
      }
    }
    
    router.push(`/admin?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  // Data loaders
  const {
    data: stagingLeads,
    loading: stagingLoading,
    error: stagingError,
    refetch: refetchStaging
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await getStagingLeads()
    },
    {
      cacheKey: 'staging_leads',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user
    }
  )

  const {
    data: assignedLeads,
    loading: assignedLoading,
    error: assignedError,
    refetch: refetchAssigned
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await getAssignedLeads(userId, userRole)
    },
    {
      cacheKey: 'assigned_leads',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user
    }
  )

  // Filter data based on search term
  const filterLeads = (leads: Person[]) => {
    return leads.filter((lead) =>
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.phone?.some(phone => phone.includes(searchTerm))
    )
  }

  const filteredStagingLeads = filterLeads(stagingLeads || [])
  const filteredAssignedLeads = filterLeads(assignedLeads || [])

  // Paginate data
  const paginatedStagingLeads = filteredStagingLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedAssignedLeads = filteredAssignedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Update URL when state changes
  useEffect(() => {
    updateUrlState({ tab: activeTab, page: currentPage, search: searchTerm })
  }, [activeTab, currentPage, searchTerm, updateUrlState])

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1) // Reset to first page when changing tabs
  }

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleAssignLead = async () => {
    if (!selectedLead || !selectedUserId) return

    try {
      setAssigning(true)
      
      const requestBody = {
        leadId: selectedLead.id,
        userId: selectedUserId,
        assignedBy: user?.id, // Add the admin's user ID
        followUpFrequency: selectedFrequency,
        followUpDayOfWeek: selectedDayOfWeek,
        notes: assignmentNotes
      }
      
      const response = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to assign lead')
      }

      // Refetch data
      refetchStaging()
      refetchAssigned()
      
      // Close dialog and reset form
      setAssignDialogOpen(false)
      setSelectedLead(null)
      setSelectedUserId('')
      setSelectedFrequency('weekly')
      setSelectedDayOfWeek(1)
      setAssignmentNotes('')
      
    } catch (error) {
      console.error('Error assigning lead:', error)
    } finally {
      setAssigning(false)
    }
  }

  const openAssignDialog = (lead: Person) => {
    setSelectedLead(lead)
    setSelectedUserId('')
    setSelectedFrequency('weekly')
    setSelectedDayOfWeek(1)
    setAssignmentNotes('')
    setAssignDialogOpen(true)
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

  const getCurrentLeads = () => {
    return activeTab === 'staging' ? paginatedStagingLeads : paginatedAssignedLeads
  }

  const getCurrentTotal = () => {
    return activeTab === 'staging' ? filteredStagingLeads.length : filteredAssignedLeads.length
  }

  const getCurrentLoading = () => {
    return activeTab === 'staging' ? stagingLoading : assignedLoading
  }

  const getCurrentError = () => {
    return activeTab === 'staging' ? stagingError : assignedError
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="staging">
              Staging Leads ({stagingLeads?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="assigned">
              Assigned Leads ({assignedLeads?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'staging' ? 'Staging Leads' : 'Assigned Leads'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'staging' 
                    ? 'New leads waiting to be assigned to agents' 
                    : 'Leads that have been assigned to agents'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getCurrentLoading() ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading leads...</div>
                  </div>
                ) : getCurrentError() ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Error loading leads</AlertDescription>
                  </Alert>
                ) : getCurrentLeads().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {activeTab === 'staging' 
                      ? 'No staging leads found' 
                      : 'No assigned leads found'
                    }
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Created</TableHead>
                          {activeTab === 'assigned' && <TableHead>Assigned To</TableHead>}
                          {activeTab === 'assigned' && <TableHead>Assigned From</TableHead>}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getCurrentLeads().map((lead: Person) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">
                              <Link 
                                href={`/people/${lead.id}?fromAdmin=true&leadTab=${activeTab}&leadPage=${currentPage}&leadSearch=${encodeURIComponent(searchTerm)}`}
                                className="hover:underline text-primary"
                              >
                                {lead.first_name} {lead.last_name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(lead.lead_status || 'staging')}
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
                                    {formatPhoneNumberForDisplay(lead.phone[0])}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getLeadSourceBadge(lead.lead_source || 'unknown')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-2 h-3 w-3" />
                                {new Date(lead.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            {activeTab === 'assigned' && (
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
                            )}
                            {activeTab === 'assigned' && (
                              <TableCell>
                                {lead.assigned_by_user ? (
                                  <div className="flex items-center">
                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {lead.assigned_by_user.first_name || lead.assigned_by_user.email.split('@')[0]}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      asChild
                                    >
                                      <Link href={`/people/${lead.id}?fromAdmin=true&leadTab=${activeTab}&leadPage=${currentPage}&leadSearch=${encodeURIComponent(searchTerm)}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    
                                    <p>View lead details</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                {activeTab === 'staging' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => openAssignDialog(lead)}
                                      >
                                        <UserPlus className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Assign lead to user</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <DataTablePagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(getCurrentTotal() / itemsPerPage)}
                      onPageChange={handlePageChange}
                      totalItems={getCurrentTotal()}
                      startIndex={(currentPage - 1) * itemsPerPage + 1}
                      endIndex={Math.min(currentPage * itemsPerPage, getCurrentTotal())}
                      hasNextPage={currentPage < Math.ceil(getCurrentTotal() / itemsPerPage)}
                      hasPreviousPage={currentPage > 1}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Lead Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Lead</DialogTitle>
              <DialogDescription>
                Assign {selectedLead?.first_name} {selectedLead?.last_name} to a user with a follow-up plan
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent">Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.first_name || agent.email.split('@')[0]} ({agent.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                            <div className="space-y-2">
                <Label htmlFor="frequency">Follow-up Frequency</Label>
                <Select value={selectedFrequency} onValueChange={(value: 'twice_week' | 'weekly' | 'biweekly' | 'monthly') => setSelectedFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose follow-up frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twice_week">Twice a Week (Monday & Thursday)</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This will automatically create follow-up tasks based on the selected frequency
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Preferred Day of Week</Label>
                <Select value={String(selectedDayOfWeek)} onValueChange={(value) => setSelectedDayOfWeek(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose day of week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Follow-ups will be scheduled on this day of the week
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Assignment Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this assignment..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={assigning}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignLead}
                  disabled={!selectedUserId || assigning}
                >
                  {assigning ? 'Assigning...' : 'Assign Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 