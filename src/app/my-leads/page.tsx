'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, Tag } from 'lucide-react'
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
import { AlertModal } from '@/components/ui/alert-modal'
import { useAuth } from '@/contexts/AuthContext'
import { getLeadsWithTags, getLeadsByTag, getLeadStatsWithTags, getLeadTags, updateLeadTagForLead, updateLeadStatus } from '@/lib/database'
import type { Person, LeadTag } from '@/lib/supabase'
import { formatPhoneNumberForDisplay, formatPhoneNumber, unformatPhoneNumber } from '@/lib/utils'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'
import Link from 'next/link'

// Load functions
const loadMyLeads = async (userId: string, userRole: string) => {
  return await getLeadsWithTags(undefined, userId, userRole)
}

const loadLeadsByTag = async (tagName: string, userId: string, userRole: string) => {
  return await getLeadsByTag(tagName, userId, userRole)
}

const loadLeadTags = async () => {
  return await getLeadTags()
}

export default function MyLeadsPage() {
  const { user, userRole } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [leadStats, setLeadStats] = useState<any>(null)
  const [leadTags, setLeadTags] = useState<LeadTag[]>([])
  const [updatingTag, setUpdatingTag] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const [openTagDialog, setOpenTagDialog] = useState<string | null>(null)
  const [openStatusDialog, setOpenStatusDialog] = useState<string | null>(null)
  const itemsPerPage = 10
  
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
  
  // Alert modal state
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

  // Define loadStats function
  const loadStats = async () => {
    try {
      const stats = await getLeadStatsWithTags(user?.id, user?.role)
      setLeadStats(stats)
    } catch (error) {
      // Error loading stats
    }
  }

  // Data loaders
  const {
    data: allLeads,
    loading: allLeadsLoading,
    error: allLeadsError,
    refetch: refetchAllLeads
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadMyLeads(userId, userRole)
    },
    {
      cacheKey: 'my_leads_all',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user?.id && !!userRole
    }
  )

  const {
    data: hotLeads,
    loading: hotLeadsLoading,
    error: hotLeadsError,
    refetch: refetchHotLeads
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadLeadsByTag('Hot', userId, userRole)
    },
    {
      cacheKey: 'my_leads_hot',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user?.id && !!userRole
    }
  )

  const {
    data: warmLeads,
    loading: warmLeadsLoading,
    error: warmLeadsError,
    refetch: refetchWarmLeads
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadLeadsByTag('Warm', userId, userRole)
    },
    {
      cacheKey: 'my_leads_warm',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user?.id && !!userRole
    }
  )

  const {
    data: coldLeads,
    loading: coldLeadsLoading,
    error: coldLeadsError,
    refetch: refetchColdLeads
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadLeadsByTag('Cold', userId, userRole)
    },
    {
      cacheKey: 'my_leads_cold',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user?.id && !!userRole
    }
  )

  const {
    data: deadLeads,
    loading: deadLeadsLoading,
    error: deadLeadsError,
    refetch: refetchDeadLeads
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadLeadsByTag('Dead', userId, userRole)
    },
    {
      cacheKey: 'my_leads_dead',
      cacheTimeout: 30 * 1000, // 30 seconds cache
      enabled: !!user?.id && !!userRole
    }
  )

  const {
    data: tags,
    loading: tagsLoading,
    error: tagsError,
    refetch: refetchTags
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await loadLeadTags()
    },
    {
      cacheKey: 'lead_tags',
      cacheTimeout: 60 * 1000, // 1 minute cache
      enabled: !!user?.id && !!userRole
    }
  )

  // Set active tab based on user role after hooks are called
  useEffect(() => {
    if (userRole) {
      setActiveTab('all')
    }
  }, [userRole])

  // Reset to page 1 when switching tabs or changing search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm])

  // Load stats and tags on mount
  useEffect(() => {
    loadStats()
    if (tags) {
      setLeadTags(tags)
    }
  }, [tags])

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

  // Allow both agents and admins to access this page
  if (userRole !== 'agent' && userRole !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Access denied. This page is for agents and admins only.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get current leads based on active tab
  const getCurrentLeads = () => {
    switch (activeTab) {
      case 'hot':
        return hotLeads || []
      case 'warm':
        return warmLeads || []
      case 'cold':
        return coldLeads || []
      case 'dead':
        return deadLeads || []
      default:
        return allLeads || []
    }
  }

  const currentLeads = getCurrentLeads()

  // Filter data based on search term
  const filteredLeads = currentLeads.filter((lead: Person) =>
    `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lead.phone?.some(phone => phone.includes(searchTerm))
  )

  // Paginate data
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleUpdateTag = async (leadId: string) => {
    if (!selectedTagId) return

    try {
      setUpdatingTag(leadId)
      const tagId: string | null = selectedTagId === 'none' ? null : selectedTagId
      await updateLeadTagForLead(leadId, tagId, user?.id || '')
      setSelectedTagId('')
      setOpenTagDialog(null)
      
      // Refetch all data
      refetchAllLeads()
      refetchHotLeads()
      refetchWarmLeads()
      refetchColdLeads()
      refetchDeadLeads()
      loadStats()
    } catch (error) {
      // console.error('Error updating tag:', error)
    } finally {
      setUpdatingTag(null)
    }
  }

  const handleOpenTagDialog = (leadId: string, currentTagId: string) => {
    setOpenTagDialog(leadId)
    setSelectedTagId(currentTagId)
  }

  const handleUpdateStatus = async (leadId: string) => {
    if (!selectedStatus) return

    try {
      setUpdatingStatus(leadId)
      await updateLeadStatus(leadId, selectedStatus as any, user?.id || '')
      setSelectedStatus('')
      setOpenStatusDialog(null)
      
      // Refetch all data
      refetchAllLeads()
      refetchHotLeads()
      refetchWarmLeads()
      refetchColdLeads()
      refetchDeadLeads()
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
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLeadData,
          phone: unformatPhoneNumber(newLeadData.phone),
          assignedTo: user?.id, // Directly assign to the current user
          skipReports: true // Flag to skip admin reports
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
        
        // Refetch leads
        refetchAllLeads()
        refetchHotLeads()
        refetchWarmLeads()
        refetchColdLeads()
        refetchDeadLeads()
        loadStats()
        
        // Show success message
        setAlertModal({
          open: true,
          title: 'Success',
          message: `Lead ${newLeadData.firstName} ${newLeadData.lastName} has been created and assigned to you`,
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

  const getTagBadge = (tag: LeadTag | null) => {
    if (!tag) {
      return (
        <Badge variant="outline">
          <Tag className="mr-1 h-3 w-3" />
          Untagged
        </Badge>
      )
    }

    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: tag.color, 
          color: tag.color,
          backgroundColor: `${tag.color}10`
        }}
      >
        <Tag className="mr-1 h-3 w-3" />
        {tag.name}
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
      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {userRole === 'admin' ? 'My Assigned Leads' : 'My Leads'}
            </h2>
            <p className="text-muted-foreground">
              {userRole === 'admin' 
                ? 'Manage leads assigned to you (excludes staging leads) with tag-based organization'
                : 'Manage your assigned leads with tag-based organization'
              }
            </p>
          </div>
          <Button
            onClick={() => setCreateLeadDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>

        {/* Stats Cards */}
        {leadStats && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hot</CardTitle>
                <Badge variant="outline" style={{ borderColor: '#EF4444', color: '#EF4444' }}>H</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.tags.hot}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warm</CardTitle>
                <Badge variant="outline" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>W</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.tags.warm}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cold</CardTitle>
                <Badge variant="outline" style={{ borderColor: '#6B7280', color: '#6B7280' }}>C</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.tags.cold}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dead</CardTitle>
                <Badge variant="outline" style={{ borderColor: '#374151', color: '#374151' }}>D</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.tags.dead}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contacted</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.contacted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{leadStats.converted}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
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
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({allLeads?.length || 0})</TabsTrigger>
            <TabsTrigger value="hot">Hot ({hotLeads?.length || 0})</TabsTrigger>
            <TabsTrigger value="warm">Warm ({warmLeads?.length || 0})</TabsTrigger>
            <TabsTrigger value="cold">Cold ({coldLeads?.length || 0})</TabsTrigger>
            <TabsTrigger value="dead">Dead ({deadLeads?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Leads - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</CardTitle>
                <CardDescription>
                  Your leads organized by priority tags
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allLeadsLoading || hotLeadsLoading || warmLeadsLoading || coldLeadsLoading || deadLeadsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading leads...</div>
                  </div>
                ) : allLeadsError || hotLeadsError || warmLeadsError || coldLeadsError || deadLeadsError ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Error loading leads</AlertDescription>
                  </Alert>
                ) : paginatedLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads found in this category
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned From</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Last Contact</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLeads.map((lead: Person) => (
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
                              {getTagBadge(lead.lead_tag || null)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(lead.lead_status || 'assigned')}
                            </TableCell>
                            <TableCell className="max-w-[120px]">
                              {lead.assigned_by_user ? (
                                <div className="flex items-center">
                                  <User className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm truncate">
                                    {lead.assigned_by_user.first_name || lead.assigned_by_user.email.split('@')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="space-y-1">
                                {lead.email && lead.email[0] && (
                                  <div className="flex items-center text-sm">
                                    <Mail className="mr-2 h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <a
                                      href={`mailto:${lead.email[0]}`}
                                      className="truncate hover:underline text-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {lead.email[0]}
                                    </a>
                                  </div>
                                )}
                                {lead.phone && lead.phone[0] && (
                                  <div className="flex items-center text-sm">
                                    <Phone className="mr-2 h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <a
                                      href={`tel:${lead.phone[0]}`}
                                      className="truncate hover:underline text-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {formatPhoneNumberForDisplay(lead.phone[0])}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[140px]">
                              {getLeadSourceBadge(lead.lead_source || 'unknown')}
                            </TableCell>
                            <TableCell className="max-w-[120px]">
                              {lead.last_interaction ? (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="mr-2 h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{new Date(lead.last_interaction).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="flex items-center space-x-2">
                                <Dialog
                                  open={openTagDialog === lead.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setOpenTagDialog(null)
                                      setSelectedTagId('')
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenTagDialog(lead.id, lead.lead_tag_id || '')}
                                    >
                                      <Tag className="mr-2 h-3 w-3" />
                                      Update Tag
                                    </Button>
                                  </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Update Lead Tag</DialogTitle>
                                    <DialogDescription>
                                      Current tag: <strong>{lead.lead_tag?.name || 'Untagged'}</strong><br />
                                      Update the tag for {lead.first_name} {lead.last_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">New Tag</label>
                                      <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Choose a tag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Untagged</SelectItem>
                                          {leadTags.map((tag) => (
                                            <SelectItem key={tag.id} value={tag.id}>
                                              {tag.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button 
                                      onClick={() => handleUpdateTag(lead.id)}
                                      disabled={!selectedTagId || updatingTag === lead.id}
                                      className="w-full"
                                    >
                                      {updatingTag === lead.id ? 'Updating...' : 'Update Tag'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
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
                            </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                    <DataTablePagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredLeads.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredLeads.length}
                      startIndex={(currentPage - 1) * itemsPerPage + 1}
                      endIndex={Math.min(currentPage * itemsPerPage, filteredLeads.length)}
                      hasNextPage={currentPage < Math.ceil(filteredLeads.length / itemsPerPage)}
                      hasPreviousPage={currentPage > 1}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Create Lead Dialog */}
        <Dialog open={createLeadDialogOpen} onOpenChange={setCreateLeadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead directly to your assigned leads. This lead will not appear in admin reports.
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
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    setNewLeadData(prev => ({ ...prev, phone: formatted }))
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newLeadData.notes}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any relevant notes about this lead..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
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