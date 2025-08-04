'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, User, Target, Calendar, Phone, Mail, Eye, UserPlus, Clock, AlertCircle, CheckCircle, XCircle, ArrowLeft, RefreshCw, Trash2, Archive, Plus, Sparkles } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { AlertModal } from '@/components/ui/alert-modal'
import { getStagingLeads, getAssignedLeads, getArchivedLeads } from '@/lib/database'
import type { Person } from '@/lib/supabase'
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
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Person | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedFrequency, setSelectedFrequency] = useState<'twice_week' | 'weekly' | 'biweekly' | 'monthly'>('twice_week')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1) // Monday
  const [assigning, setAssigning] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [reassignmentNotes, setReassignmentNotes] = useState('')
  const [copyFollowUps, setCopyFollowUps] = useState(true)
  const [copyNotes, setCopyNotes] = useState(true)
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
  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false)
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkArchiving, setBulkArchiving] = useState(false)
  
  // Manual lead creation state
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  const [newLeadData, setNewLeadData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'manual',
    notes: ''
  })
  
  // Duplicate removal state
  const [removeDuplicatesDialogOpen, setRemoveDuplicatesDialogOpen] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [removingDuplicates, setRemovingDuplicates] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null)
  
  const itemsPerPage = 20

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

  const {
    data: archivedLeads,
    loading: archivedLoading,
    error: archivedError,
    refetch: refetchArchived
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await getArchivedLeads(userId, userRole)
    },
    {
      cacheKey: 'archived_leads',
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
  const filteredArchivedLeads = filterLeads(archivedLeads || [])

  // Paginate data
  const paginatedStagingLeads = filteredStagingLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedAssignedLeads = filteredAssignedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedArchivedLeads = filteredArchivedLeads.slice(
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
      setSelectedFrequency('twice_week')
      setSelectedDayOfWeek(1)
      setAssignmentNotes('')
      
    } catch (error) {
      console.error('Error assigning lead:', error)
    } finally {
      setAssigning(false)
    }
  }

  const handleReassignLead = async () => {
    if (!selectedLead || !selectedUserId) return

    try {
      setReassigning(true)
      
      const requestBody = {
        leadId: selectedLead.id,
        newUserId: selectedUserId,
        reassignedBy: user?.id,
        followUpFrequency: selectedFrequency,
        followUpDayOfWeek: selectedDayOfWeek,
        copyFollowUps,
        copyNotes,
        reassignmentNotes
      }
      
      const response = await fetch('/api/leads/reassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to reassign lead')
      }

      const result = await response.json()

      // Refetch data
      refetchStaging()
      refetchAssigned()
      
      // Close dialog and reset form
      setReassignDialogOpen(false)
      setSelectedLead(null)
      setSelectedUserId('')
      setCopyFollowUps(true)
      setCopyNotes(true)
      setReassignmentNotes('')
      
      // Show success message
      const selectedAgent = agents.find(agent => agent.id === selectedUserId)
      const agentName = selectedAgent ? (selectedAgent.first_name || selectedAgent.email.split('@')[0]) : 'Unknown User'
      
      setAlertModal({
        open: true,
        title: 'Success',
        message: `Lead reassigned to ${agentName} successfully! Copied ${result.copiedFollowUps} follow-ups and ${result.copiedNotes} notes.`,
        type: 'success'
      })
      
    } catch (error) {
      console.error('Error reassigning lead:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to reassign lead. Please try again.',
        type: 'error'
      })
    } finally {
      setReassigning(false)
    }
  }

  const openAssignDialog = (lead: Person) => {
    setSelectedLead(lead)
    setSelectedUserId('')
    setSelectedFrequency('twice_week')
    setSelectedDayOfWeek(1)
    setAssignmentNotes('')
    setAssignDialogOpen(true)
  }

  const openReassignDialog = (lead: Person) => {
    setSelectedLead(lead)
    setSelectedUserId('')
    setSelectedFrequency('twice_week')
    setSelectedDayOfWeek(1)
    setCopyFollowUps(true)
    setCopyNotes(true)
    setReassignmentNotes('')
    setReassignDialogOpen(true)
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
    if (activeTab === 'staging') return paginatedStagingLeads
    if (activeTab === 'assigned') return paginatedAssignedLeads
    if (activeTab === 'archived') return paginatedArchivedLeads
    return paginatedStagingLeads
  }

  const getCurrentTotal = () => {
    if (activeTab === 'staging') return filteredStagingLeads.length
    if (activeTab === 'assigned') return filteredAssignedLeads.length
    if (activeTab === 'archived') return filteredArchivedLeads.length
    return filteredStagingLeads.length
  }

  const getCurrentLoading = () => {
    if (activeTab === 'staging') return stagingLoading
    if (activeTab === 'assigned') return assignedLoading
    if (activeTab === 'archived') return archivedLoading
    return stagingLoading
  }

  const getCurrentError = () => {
    if (activeTab === 'staging') return stagingError
    if (activeTab === 'assigned') return assignedError
    if (activeTab === 'archived') return archivedError
    return stagingError
  }

  // Bulk selection handlers
  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
    setSelectAll(newSelected.size === getCurrentLeads().length)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set())
      setSelectAll(false)
    } else {
      const allLeadIds = getCurrentLeads().map(lead => lead.id)
      setSelectedLeads(new Set(allLeadIds))
      setSelectAll(true)
    }
  }

  const clearSelection = () => {
    setSelectedLeads(new Set())
    setSelectAll(false)
  }

  // Reset selection when changing tabs or pages
  useEffect(() => {
    clearSelection()
  }, [activeTab, currentPage])

  const getSelectedLeadsData = () => {
    return getCurrentLeads().filter(lead => selectedLeads.has(lead.id))
  }

  // Bulk action handlers
  const handleBulkAssign = async () => {
    if (selectedLeads.size === 0 || !selectedUserId) return

    try {
      setBulkAssigning(true)
      
      const selectedLeadsData = getSelectedLeadsData()
      const results = await Promise.allSettled(
        selectedLeadsData.map(lead => 
          fetch('/api/leads/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: lead.id,
              userId: selectedUserId,
              assignedBy: user?.id,
              followUpFrequency: selectedFrequency,
              followUpDayOfWeek: selectedDayOfWeek,
              notes: assignmentNotes
            })
          })
        )
      )

      const successful = results.filter(result => result.status === 'fulfilled' && result.value.ok).length
      const failed = results.length - successful

      // Refetch data
      refetchStaging()
      refetchAssigned()
      
      // Close dialog and reset form
      setBulkAssignDialogOpen(false)
      setSelectedUserId('')
      setSelectedFrequency('twice_week')
      setSelectedDayOfWeek(1)
      setAssignmentNotes('')
      clearSelection()
      
      // Show success message
      setAlertModal({
        open: true,
        title: 'Bulk Assignment Complete',
        message: `Successfully assigned ${successful} leads${failed > 0 ? `, ${failed} failed` : ''}.`,
        type: successful > 0 ? 'success' : 'error'
      })
      
    } catch (error) {
      console.error('Error bulk assigning leads:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to assign leads. Please try again.',
        type: 'error'
      })
    } finally {
      setBulkAssigning(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) return

    try {
      setBulkDeleting(true)
      
      const selectedLeadsData = getSelectedLeadsData()
      const results = await Promise.allSettled(
        selectedLeadsData.map(lead => 
          fetch(`/api/admin/delete-lead`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: lead.id })
          })
        )
      )

      const successful = results.filter(result => result.status === 'fulfilled' && result.value.ok).length
      const failed = results.length - successful

      // Refetch data
      refetchStaging()
      refetchAssigned()
      refetchArchived()
      
      // Close dialog and reset
      setBulkDeleteDialogOpen(false)
      clearSelection()
      
      // Show success message
      setAlertModal({
        open: true,
        title: 'Bulk Delete Complete',
        message: `Successfully deleted ${successful} leads${failed > 0 ? `, ${failed} failed` : ''}.`,
        type: successful > 0 ? 'success' : 'error'
      })
      
    } catch (error) {
      console.error('Error bulk deleting leads:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to delete leads. Please try again.',
        type: 'error'
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkArchive = async () => {
    if (selectedLeads.size === 0) return

    try {
      setBulkArchiving(true)
      
      const selectedLeadsData = getSelectedLeadsData()
      const results = await Promise.allSettled(
        selectedLeadsData.map(lead => 
          fetch(`/api/admin/archive-lead`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: lead.id, archivedBy: user?.id })
          })
        )
      )

      const successful = results.filter(result => result.status === 'fulfilled' && result.value.ok).length
      const failed = results.length - successful

      // Refetch data
      refetchStaging()
      refetchAssigned()
      refetchArchived()
      
      // Close dialog and reset
      setBulkArchiveDialogOpen(false)
      clearSelection()
      
      // Show success message
      setAlertModal({
        open: true,
        title: 'Bulk Archive Complete',
        message: `Successfully archived ${successful} leads${failed > 0 ? `, ${failed} failed` : ''}.`,
        type: successful > 0 ? 'success' : 'error'
      })
      
    } catch (error) {
      console.error('Error bulk archiving leads:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to archive leads. Please try again.',
        type: 'error'
      })
    } finally {
      setBulkArchiving(false)
    }
  }

  // Manual lead creation handler
  const handleCreateLead = async () => {
    if (!newLeadData.firstName || !newLeadData.lastName) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'First name and last name are required',
        type: 'error'
      })
      return
    }

    try {
      setCreatingLead(true)
      
      const response = await fetch('/api/admin/create-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLeadData,
          createdBy: user?.id
        })
      })

      const result = await response.json()

      if (response.ok) {
        // Reset form
        setNewLeadData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          source: 'manual',
          notes: ''
        })
        setCreateLeadDialogOpen(false)
        
        // Refetch staging leads
        refetchStaging()
        
        // Show success message
        setAlertModal({
          open: true,
          title: 'Success',
          message: `Lead ${newLeadData.firstName} ${newLeadData.lastName} has been created successfully`,
          type: 'success'
        })
      } else {
        setAlertModal({
          open: true,
          title: 'Error',
          message: result.error || 'Failed to create lead',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to create lead. Please try again.',
        type: 'error'
      })
    } finally {
      setCreatingLead(false)
    }
  }

  // Check for duplicates
  const handleCheckDuplicates = async () => {
    try {
      setCheckingDuplicates(true)
      
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })

      const result = await response.json()

      if (response.ok) {
        setDuplicateInfo(result)
        if (result.duplicates.length === 0) {
          setAlertModal({
            open: true,
            title: 'No Duplicates Found',
            message: 'There are no duplicate leads in the staging area.',
            type: 'info'
          })
          setRemoveDuplicatesDialogOpen(false)
        }
      } else {
        setAlertModal({
          open: true,
          title: 'Error',
          message: result.error || 'Failed to check for duplicates',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to check for duplicates. Please try again.',
        type: 'error'
      })
    } finally {
      setCheckingDuplicates(false)
    }
  }

  // Remove duplicates
  const handleRemoveDuplicates = async () => {
    try {
      setRemovingDuplicates(true)
      
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      })

      const result = await response.json()

      if (response.ok) {
        // Refetch staging leads
        refetchStaging()
        
        // Close dialog
        setRemoveDuplicatesDialogOpen(false)
        setDuplicateInfo(null)
        
        // Show success message
        setAlertModal({
          open: true,
          title: 'Success',
          message: result.message,
          type: 'success'
        })
      } else {
        setAlertModal({
          open: true,
          title: 'Error',
          message: result.error || 'Failed to remove duplicates',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error removing duplicates:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to remove duplicates. Please try again.',
        type: 'error'
      })
    } finally {
      setRemovingDuplicates(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Search and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'staging' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRemoveDuplicatesDialogOpen(true)
                      setDuplicateInfo(null)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Remove Duplicates
                  </Button>
                )}
                <Button
                  onClick={() => setCreateLeadDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Lead
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bulk Actions */}
        {selectedLeads.size > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedLeads.size} selected
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground"
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  {activeTab === 'staging' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setBulkAssignDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign to Agent ({selectedLeads.size})
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedLeads.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkArchiveDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Archive ({selectedLeads.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="w-full md:w-fit min-w-full md:min-w-0 flex md:inline-flex">
              <TabsTrigger value="staging" className="flex-1 md:flex-initial text-xs sm:text-sm">
                <span className="hidden sm:inline">Staging Leads</span>
                <span className="sm:hidden">Staging</span>
                <span className="ml-1">({stagingLeads?.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="assigned" className="flex-1 md:flex-initial text-xs sm:text-sm">
                <span className="hidden sm:inline">Assigned Leads</span>
                <span className="sm:hidden">Assigned</span>
                <span className="ml-1">({assignedLeads?.length || 0})</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="flex-1 md:flex-initial text-xs sm:text-sm">
                <span className="hidden sm:inline">Archived Leads</span>
                <span className="sm:hidden">Archived</span>
                <span className="ml-1">({archivedLeads?.length || 0})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'staging' ? 'Staging Leads' : 
                   activeTab === 'assigned' ? 'Assigned Leads' : 
                   'Archived Leads'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'staging' 
                    ? 'New leads waiting to be assigned to agents' 
                    : activeTab === 'assigned'
                    ? 'Leads that have been assigned to agents'
                    : 'Leads that have been archived and are no longer active'
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
                      : activeTab === 'assigned'
                      ? 'No assigned leads found'
                      : 'No archived leads found'
                    }
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Created</TableHead>
                          {(activeTab === 'assigned' || activeTab === 'archived') && <TableHead>Assigned To</TableHead>}
                          {(activeTab === 'assigned' || activeTab === 'archived') && <TableHead>Assigned From</TableHead>}
                          {activeTab === 'archived' && <TableHead>Archived</TableHead>}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getCurrentLeads().map((lead: Person) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedLeads.has(lead.id)}
                                onChange={() => handleSelectLead(lead.id)}
                                className="rounded border-gray-300"
                              />
                            </TableCell>
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
                            {(activeTab === 'assigned' || activeTab === 'archived') && (
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
                            {(activeTab === 'assigned' || activeTab === 'archived') && (
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
                            {activeTab === 'archived' && (
                              <TableCell>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Archive className="mr-2 h-3 w-3" />
                                  {lead.archived_at ? new Date(lead.archived_at).toLocaleDateString() : '-'}
                                </div>
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

                                {activeTab === 'assigned' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => openReassignDialog(lead)}
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Reassign lead to different user</p>
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

        {/* Reassign Lead Dialog */}
        <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reassign Lead</DialogTitle>
              <DialogDescription>
                Reassign {selectedLead?.first_name} {selectedLead?.last_name} to a different user with follow-up frequency and data copying options
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newAgent">Select New User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a new user" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Follow-up Frequency</Label>
                  <Select value={selectedFrequency} onValueChange={(value: 'twice_week' | 'weekly' | 'biweekly' | 'monthly') => setSelectedFrequency(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twice_week">Twice a Week (Mon & Thu)</SelectItem>
                      <SelectItem value="weekly">Every Week</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Every Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Preferred Day</Label>
                  <Select value={String(selectedDayOfWeek)} onValueChange={(value) => setSelectedDayOfWeek(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose day" />
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
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Auto follow-ups will be created based on the selected frequency and day
              </p>

              <div className="space-y-3">
                <Label>Copy Options</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="copyFollowUps"
                      checked={copyFollowUps}
                      onCheckedChange={setCopyFollowUps}
                    />
                    <Label htmlFor="copyFollowUps" className="text-sm">Copy existing follow-ups</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="copyNotes"
                      checked={copyNotes}
                      onCheckedChange={setCopyNotes}
                    />
                    <Label htmlFor="copyNotes" className="text-sm">Copy recent notes (last 10)</Label>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Copy selected data to the new user's view
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reassignmentNotes">Reassignment Notes (Optional)</Label>
                <Textarea
                  id="reassignmentNotes"
                  placeholder="Add any notes about this reassignment..."
                  value={reassignmentNotes}
                  onChange={(e) => setReassignmentNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setReassignDialogOpen(false)}
                  disabled={reassigning}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleReassignLead}
                  disabled={!selectedUserId || reassigning}
                >
                  {reassigning ? 'Reassigning...' : 'Reassign Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Dialog */}
        <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Assign Leads</DialogTitle>
              <DialogDescription>
                Assign {selectedLeads.size} selected leads to a user with a follow-up plan
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkAgent">Select User</Label>
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
                <Label htmlFor="bulkFrequency">Follow-up Frequency</Label>
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
                <Label htmlFor="bulkDayOfWeek">Preferred Day of Week</Label>
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
                <Label htmlFor="bulkNotes">Assignment Notes (Optional)</Label>
                <Textarea
                  id="bulkNotes"
                  placeholder="Add any notes about this assignment..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setBulkAssignDialogOpen(false)}
                  disabled={bulkAssigning}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkAssign}
                  disabled={!selectedUserId || bulkAssigning}
                >
                  {bulkAssigning ? 'Assigning...' : `Assign ${selectedLeads.size} Leads`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Delete Leads</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete {selectedLeads.size} selected leads?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="font-medium text-destructive">Warning</span>
                </div>
                <p className="text-sm text-destructive mt-2">
                  This action cannot be undone. All data associated with these leads will be permanently deleted.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setBulkDeleteDialogOpen(false)}
                  disabled={bulkDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? 'Deleting...' : `Delete ${selectedLeads.size} Leads`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Archive Dialog */}
        <Dialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Archive Leads</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive {selectedLeads.size} selected leads?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Archive Information</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Archived leads will be moved to a separate archive and will no longer appear in active lists. 
                  You can view them in the Archived tab.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setBulkArchiveDialogOpen(false)}
                  disabled={bulkArchiving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={bulkArchiving}
                >
                  {bulkArchiving ? 'Archiving...' : `Archive ${selectedLeads.size} Leads`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Lead Dialog */}
        <Dialog open={createLeadDialogOpen} onOpenChange={setCreateLeadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Manually add a new lead to the staging area
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newLeadData.firstName}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newLeadData.lastName}
                    onChange={(e) => setNewLeadData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Select value={newLeadData.source} onValueChange={(value) => setNewLeadData(prev => ({ ...prev, source: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newLeadData.notes}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional information about this lead..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateLeadDialogOpen(false)
                    setNewLeadData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      source: 'manual',
                      notes: ''
                    })
                  }}
                  disabled={creatingLead}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateLead}
                  disabled={creatingLead || !newLeadData.firstName || !newLeadData.lastName}
                >
                  {creatingLead ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Duplicates Dialog */}
        <Dialog open={removeDuplicatesDialogOpen} onOpenChange={setRemoveDuplicatesDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Remove Duplicate Leads</DialogTitle>
              <DialogDescription>
                {!duplicateInfo 
                  ? "Check for duplicate leads in the staging area based on exact matching information"
                  : `Found ${duplicateInfo.duplicates.length} groups of duplicates (${duplicateInfo.removed || 0} leads to remove)`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {!duplicateInfo ? (
                // Initial state - show check button
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 border rounded-lg">
                    <p className="text-sm">
                      This will find leads with exactly matching:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>First and Last Name</li>
                      <li>Email Address</li>
                      <li>Phone Number</li>
                      <li>Lead Source</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      The oldest lead in each group will be kept, newer duplicates will be removed.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setRemoveDuplicatesDialogOpen(false)}
                      disabled={checkingDuplicates}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCheckDuplicates}
                      disabled={checkingDuplicates}
                    >
                      {checkingDuplicates ? 'Checking...' : 'Check for Duplicates'}
                    </Button>
                  </div>
                </div>
              ) : duplicateInfo.duplicates.length > 0 ? (
                // Found duplicates - show details
                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-3">
                    {duplicateInfo.duplicates.map((group: any, index: number) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Duplicate Group {index + 1}</p>
                          <div className="space-y-1">
                            {group.leads.map((lead: any) => (
                              <div 
                                key={lead.id} 
                                className={`text-xs flex items-center justify-between p-2 rounded ${
                                  lead.toRemove ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                                }`}
                              >
                                <span>
                                  {lead.name} • {lead.email || 'No email'} • {lead.phone || 'No phone'}
                                </span>
                                <Badge variant={lead.toRemove ? 'destructive' : 'secondary'} className="text-xs">
                                  {lead.toRemove ? 'To Remove' : 'Keep'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium text-destructive">Warning</span>
                    </div>
                    <p className="text-sm text-destructive mt-2">
                      This will permanently delete {duplicateInfo.removed || duplicateInfo.duplicates.reduce((acc: number, g: any) => acc + g.leads.filter((l: any) => l.toRemove).length, 0)} duplicate leads. This action cannot be undone.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setRemoveDuplicatesDialogOpen(false)
                        setDuplicateInfo(null)
                      }}
                      disabled={removingDuplicates}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleRemoveDuplicates}
                      disabled={removingDuplicates}
                    >
                      {removingDuplicates ? 'Removing...' : 'Remove Duplicates'}
                    </Button>
                  </div>
                </div>
              ) : (
                // No duplicates found
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">No duplicates found!</p>
                  <p className="text-sm text-muted-foreground">All staging leads are unique.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Alert Modal */}
        <AlertModal
          open={alertModal.open}
          onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />
      </div>
    </TooltipProvider>
  )
} 