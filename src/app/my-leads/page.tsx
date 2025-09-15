'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User, Target, TrendingUp, AlertCircle, CheckCircle, XCircle, Tag, Edit2, Trash2, Filter, Save, X } from 'lucide-react'
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
import { getCustomTabs, createCustomTab, updateCustomTab, deleteCustomTab } from '@/lib/customTabs'
import { setPersonTags } from '@/lib/leadTags'
import type { Person, LeadTag, CustomLeadTab } from '@/lib/supabase'
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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')

  // Custom tabs state - now from database
  const [customTabs, setCustomTabs] = useState<CustomLeadTab[]>([])
  const [loadingCustomTabs, setLoadingCustomTabs] = useState(false)

  const [showCreateTabDialog, setShowCreateTabDialog] = useState(false)
  const [editingTab, setEditingTab] = useState<CustomLeadTab | null>(null)
  const [savingTab, setSavingTab] = useState(false)
  const [newTabData, setNewTabData] = useState<{
    name: string
    filterType: 'tag' | 'status' | 'source' | 'custom'
    filterValue: string
    color: string
  }>({
    name: '',
    filterType: 'tag',
    filterValue: '',
    color: '#3B82F6'
  })
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

  // Load custom tabs from database
  useEffect(() => {
    async function loadCustomTabs() {
      if (!user?.id) return

      setLoadingCustomTabs(true)
      try {
        const tabs = await getCustomTabs(user.id)
        setCustomTabs(tabs)
      } catch (error) {
        console.error('Error loading custom tabs:', error)
      } finally {
        setLoadingCustomTabs(false)
      }
    }

    loadCustomTabs()
  }, [user?.id])

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
    // Check if it's a custom tab
    const customTab = customTabs.find(tab => tab.id === activeTab)
    if (customTab) {
      const baseLeads = allLeads || []
      return baseLeads.filter((lead: Person) => {
        switch (customTab.filter_type) {
          case 'tag':
            return customTab.filter_value === 'none'
              ? !lead.lead_tag_id
              : lead.lead_tag_id === customTab.filter_value
          case 'status':
            return lead.lead_status === customTab.filter_value
          case 'source':
            return lead.lead_source === customTab.filter_value
          case 'custom':
            // Custom filter logic - for now, search in notes
            return lead.notes?.toLowerCase().includes(customTab.filter_value.toLowerCase())
          default:
            return true
        }
      })
    }

    // Default tabs
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

  const handleUpdateTags = async (leadId: string) => {
    if (!user?.id) return

    try {
      setUpdatingTag(leadId)
      // Use the new multiple tags function
      await setPersonTags(leadId, selectedTagIds, user.id)
      setSelectedTagIds([])
      setOpenTagDialog(null)

      // Show success message
      setAlertModal({
        open: true,
        title: 'Success',
        message: 'Tags updated successfully',
        type: 'success'
      })

      // Refetch all data
      refetchAllLeads()
      refetchHotLeads()
      refetchWarmLeads()
      refetchColdLeads()
      refetchDeadLeads()
      loadStats()
    } catch (error) {
      console.error('Error updating tags:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to update tags',
        type: 'error'
      })
    } finally {
      setUpdatingTag(null)
    }
  }

  const handleOpenTagDialog = (leadId: string, lead: Person) => {
    setOpenTagDialog(leadId)
    // Set current tags from the lead
    const currentTagIds = lead.lead_tags?.map(tag => tag.id) || []
    // Also include the single tag if it exists (for backward compatibility)
    if (lead.lead_tag_id && !currentTagIds.includes(lead.lead_tag_id)) {
      currentTagIds.push(lead.lead_tag_id)
    }
    setSelectedTagIds(currentTagIds)
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

  // Custom tab handlers
  const handleCreateCustomTab = async () => {
    if (!newTabData.name.trim() || !user?.id) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Tab name is required',
        type: 'error'
      })
      return
    }

    setSavingTab(true)
    try {
      if (editingTab) {
        // Update existing tab
        const updatedTab = await updateCustomTab(user.id, editingTab.id, {
          name: newTabData.name,
          filter_type: newTabData.filterType,
          filter_value: newTabData.filterValue,
          color: newTabData.color
        })

        if (updatedTab) {
          setCustomTabs(prev => prev.map(tab =>
            tab.id === editingTab.id ? updatedTab : tab
          ))
          setAlertModal({
            open: true,
            title: 'Success',
            message: 'Tab updated successfully',
            type: 'success'
          })
        } else {
          throw new Error('Failed to update tab')
        }
        setEditingTab(null)
      } else {
        // Create new tab
        const newTab = await createCustomTab(user.id, {
          name: newTabData.name,
          filter_type: newTabData.filterType,
          filter_value: newTabData.filterValue,
          color: newTabData.color,
          tab_order: customTabs.length,
          is_active: true
        })

        if (newTab) {
          setCustomTabs(prev => [...prev, newTab])
          setAlertModal({
            open: true,
            title: 'Success',
            message: 'Tab created successfully',
            type: 'success'
          })
        } else {
          throw new Error('Failed to create tab')
        }
      }

      // Reset form and close dialog
      setNewTabData({
        name: '',
        filterType: 'tag',
        filterValue: '',
        color: '#3B82F6'
      })
      setShowCreateTabDialog(false)
    } catch (error) {
      console.error('Error saving tab:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: editingTab ? 'Failed to update tab' : 'Failed to create tab',
        type: 'error'
      })
    } finally {
      setSavingTab(false)
    }
  }

  const handleEditCustomTab = (tab: CustomLeadTab) => {
    setEditingTab(tab)
    setNewTabData({
      name: tab.name,
      filterType: tab.filter_type,
      filterValue: tab.filter_value,
      color: tab.color || '#3B82F6'
    })
    setShowCreateTabDialog(true)
  }

  const handleDeleteCustomTab = async (tabId: string) => {
    if (!user?.id) return

    try {
      const success = await deleteCustomTab(user.id, tabId)
      if (success) {
        setCustomTabs(prev => prev.filter(tab => tab.id !== tabId))
        if (activeTab === tabId) {
          setActiveTab('all')
        }
        setAlertModal({
          open: true,
          title: 'Success',
          message: 'Tab deleted successfully',
          type: 'success'
        })
      } else {
        throw new Error('Failed to delete tab')
      }
    } catch (error) {
      console.error('Error deleting tab:', error)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to delete tab',
        type: 'error'
      })
    }
  }

  // Get unique values for filters
  const getUniqueStatuses = () => {
    const statuses = new Set<string>()
    allLeads?.forEach((lead: Person) => {
      if (lead.lead_status) statuses.add(lead.lead_status)
    })
    return Array.from(statuses)
  }

  const getUniqueSources = () => {
    const sources = new Set<string>()
    allLeads?.forEach((lead: Person) => {
      if (lead.lead_source) sources.add(lead.lead_source)
    })
    return Array.from(sources)
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

  const getTagBadges = (lead: Person) => {
    // Get tags from both new array and old single tag field
    const tags: LeadTag[] = lead.lead_tags || []

    // Include the old single tag if it exists and isn't already in the array
    if (lead.lead_tag && !tags.find(t => t.id === lead.lead_tag?.id)) {
      tags.push(lead.lead_tag)
    }

    if (tags.length === 0) {
      return (
        <Badge variant="outline">
          <Tag className="mr-1 h-3 w-3" />
          Untagged
        </Badge>
      )
    }

    return (
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <Badge
            key={tag.id}
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
        ))}
      </div>
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
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Stats Cards */}
        {leadStats && (
          <div className="grid gap-2 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <TabsList className="flex flex-wrap gap-1 h-auto w-full sm:w-auto p-1 bg-muted/50">
              <TabsTrigger value="all">All ({allLeads?.length || 0})</TabsTrigger>
              <TabsTrigger value="hot">Hot ({hotLeads?.length || 0})</TabsTrigger>
              <TabsTrigger value="warm">Warm ({warmLeads?.length || 0})</TabsTrigger>
              <TabsTrigger value="cold">Cold ({coldLeads?.length || 0})</TabsTrigger>
              <TabsTrigger value="dead">Dead ({deadLeads?.length || 0})</TabsTrigger>

              {/* Custom Tabs - Desktop */}
              <div className="hidden sm:contents">
                {customTabs.map(tab => {
                  const tabLeads = getCurrentLeads()
                  const customTabCount = activeTab === tab.id ? filteredLeads.length :
                    (allLeads || []).filter((lead: Person) => {
                      switch (tab.filter_type) {
                        case 'tag':
                          return tab.filter_value === 'none'
                            ? !lead.lead_tag_id
                            : lead.lead_tag_id === tab.filter_value
                        case 'status':
                          return lead.lead_status === tab.filter_value
                        case 'source':
                          return lead.lead_source === tab.filter_value
                        case 'custom':
                          return lead.notes?.toLowerCase().includes(tab.filter_value.toLowerCase())
                        default:
                          return true
                      }
                    }).length

                  return (
                    <div key={tab.id} className="relative group inline-flex">
                      <TabsTrigger
                        value={tab.id}
                        style={{
                          borderColor: activeTab === tab.id ? tab.color : undefined,
                          borderWidth: activeTab === tab.id ? '2px' : undefined
                        }}
                        className="pr-4"
                      >
                        <div className="flex items-center">
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: tab.color }}
                          />
                          <span className="text-sm">
                            {tab.name} ({customTabCount})
                          </span>
                        </div>
                      </TabsTrigger>
                      <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-1 z-10">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditCustomTab(tab)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomTab(tab.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsList>

            {/* Custom Tabs - Mobile Card Layout */}
            {customTabs.length > 0 && (
              <div className="sm:hidden w-full space-y-2">
                {customTabs.map(tab => {
                  const customTabCount = activeTab === tab.id ? filteredLeads.length :
                    (allLeads || []).filter((lead: Person) => {
                      switch (tab.filter_type) {
                        case 'tag':
                          return tab.filter_value === 'none'
                            ? !lead.lead_tag_id
                            : lead.lead_tag_id === tab.filter_value
                        case 'status':
                          return lead.lead_status === tab.filter_value
                        case 'source':
                          return lead.lead_source === tab.filter_value
                        case 'custom':
                          return lead.notes?.toLowerCase().includes(tab.filter_value.toLowerCase())
                        default:
                          return true
                      }
                    }).length

                  return (
                    <div
                      key={tab.id}
                      className={`flex items-center justify-between p-2 rounded-md border cursor-pointer ${
                        activeTab === tab.id ? 'bg-accent' : 'bg-background hover:bg-accent/50'
                      }`}
                      style={{
                        borderColor: activeTab === tab.id ? tab.color : undefined,
                        borderWidth: activeTab === tab.id ? '2px' : undefined
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                          style={{ backgroundColor: tab.color }}
                        />
                        <span className="font-medium text-sm truncate">
                          {tab.name}
                        </span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({customTabCount})
                        </span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditCustomTab(tab)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomTab(tab.id)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Button
              onClick={() => setShowCreateTabDialog(true)}
              variant="outline"
              size="sm"
              className="h-9 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Tab
            </Button>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  My Leads - {customTabs.find(t => t.id === activeTab)?.name ||
                    (activeTab.charAt(0).toUpperCase() + activeTab.slice(1))}
                </CardTitle>
                <CardDescription>
                  {customTabs.find(t => t.id === activeTab)
                    ? `Custom filter: ${customTabs.find(t => t.id === activeTab)?.filter_type}`
                    : 'Your leads organized by priority tags'
                  }
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
                    {/* Mobile View - Cards */}
                    <div className="block md:hidden space-y-4">
                      {paginatedLeads.map((lead: Person) => (
                        <Card key={lead.id} className="p-4">
                          <div className="space-y-3">
                            {/* Header with Name and Status */}
                            <div className="flex justify-between items-start">
                              <Link
                                href={`/people/${lead.id}`}
                                className="font-medium text-lg hover:underline text-primary"
                              >
                                {lead.first_name} {lead.last_name}
                              </Link>
                              {getStatusBadge(lead.lead_status || 'assigned')}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {getTagBadges(lead)}
                            </div>

                            {/* Contact Info - Clickable */}
                            <div className="space-y-2">
                              {lead.email && lead.email[0] && (
                                <a
                                  href={`mailto:${lead.email[0]}`}
                                  className="flex items-center text-sm text-primary hover:underline"
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  <span className="truncate">{lead.email[0]}</span>
                                </a>
                              )}
                              {lead.phone && lead.phone[0] && (
                                <a
                                  href={`tel:${lead.phone[0]}`}
                                  className="flex items-center text-sm text-primary hover:underline"
                                >
                                  <Phone className="mr-2 h-4 w-4" />
                                  <span>{formatPhoneNumberForDisplay(lead.phone[0])}</span>
                                </a>
                              )}
                            </div>

                            {/* Source and Assignment Info */}
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              {lead.lead_source && (
                                <div className="flex items-center">
                                  {getLeadSourceBadge(lead.lead_source)}
                                </div>
                              )}
                              {lead.assigned_by_user && (
                                <div className="flex items-center">
                                  <User className="mr-1 h-3 w-3" />
                                  <span className="text-xs">
                                    From: {lead.assigned_by_user.first_name || lead.assigned_by_user.email.split('@')[0]}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleOpenTagDialog(lead.id, lead)}
                              >
                                <Tag className="mr-2 h-3 w-3" />
                                Tags
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleOpenStatusDialog(lead.id, lead.lead_status || 'assigned')}
                              >
                                <TrendingUp className="mr-2 h-3 w-3" />
                                Status
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block overflow-x-auto border rounded-lg">
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
                              {getTagBadges(lead)}
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
                                      setSelectedTagIds([])
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenTagDialog(lead.id, lead)}
                                    >
                                      <Tag className="mr-2 h-3 w-3" />
                                      Update Tags
                                    </Button>
                                  </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Update Lead Tags</DialogTitle>
                                    <DialogDescription>
                                      Select multiple tags for {lead.first_name} {lead.last_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Select Tags</label>
                                      <div className="space-y-2 max-h-[40vh] sm:max-h-60 overflow-y-auto border rounded-lg p-3">
                                        {leadTags.map((tag) => (
                                          <label
                                            key={tag.id}
                                            htmlFor={`tag-${tag.id}`}
                                            className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              id={`tag-${tag.id}`}
                                              checked={selectedTagIds.includes(tag.id)}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedTagIds([...selectedTagIds, tag.id])
                                                } else {
                                                  setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))
                                                }
                                              }}
                                              className="h-5 w-5 rounded border-gray-300"
                                            />
                                            <div className="flex items-center flex-1 min-w-0">
                                              <div
                                                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                                style={{ backgroundColor: tag.color }}
                                              />
                                              <span className="text-sm truncate">{tag.name}</span>
                                              {tag.description && (
                                                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline truncate">
                                                  ({tag.description})
                                                </span>
                                              )}
                                            </div>
                                          </label>
                                        ))}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleUpdateTags(lead.id)}
                                      disabled={updatingTag === lead.id}
                                      className="w-full"
                                    >
                                      {updatingTag === lead.id ? 'Updating...' : 'Update Tags'}
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
                                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
          <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead directly to your assigned leads. This lead will not appear in admin reports.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
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
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLead}
                  disabled={creatingLead || !newLeadData.firstName || !newLeadData.lastName}
                  className="w-full sm:w-auto"
                >
                  {creatingLead ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Tab Creation/Edit Dialog */}
        <Dialog open={showCreateTabDialog} onOpenChange={(open) => {
          setShowCreateTabDialog(open)
          if (!open) {
            setEditingTab(null)
            setNewTabData({
              name: '',
              filterType: 'tag',
              filterValue: '',
              color: '#3B82F6'
            })
          }
        }}>
          <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTab ? 'Edit Custom Tab' : 'Create Custom Tab'}
              </DialogTitle>
              <DialogDescription>
                Create a custom tab to filter your leads based on specific criteria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tabName">Tab Name *</Label>
                <Input
                  id="tabName"
                  value={newTabData.name}
                  onChange={(e) => setNewTabData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Follow-up Today"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterType">Filter Type</Label>
                <Select
                  value={newTabData.filterType}
                  onValueChange={(value: 'tag' | 'status' | 'source' | 'custom') =>
                    setNewTabData(prev => ({ ...prev, filterType: value, filterValue: '' }))
                  }
                >
                  <SelectTrigger id="filterType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag">Lead Tag</SelectItem>
                    <SelectItem value="status">Lead Status</SelectItem>
                    <SelectItem value="source">Lead Source</SelectItem>
                    <SelectItem value="custom">Custom (Notes Contains)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterValue">Filter Value</Label>
                {newTabData.filterType === 'tag' ? (
                  <Select
                    value={newTabData.filterValue}
                    onValueChange={(value) => setNewTabData(prev => ({ ...prev, filterValue: value }))}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue placeholder="Select a tag" />
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
                ) : newTabData.filterType === 'status' ? (
                  <Select
                    value={newTabData.filterValue}
                    onValueChange={(value) => setNewTabData(prev => ({ ...prev, filterValue: value }))}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                ) : newTabData.filterType === 'source' ? (
                  <Select
                    value={newTabData.filterValue}
                    onValueChange={(value) => setNewTabData(prev => ({ ...prev, filterValue: value }))}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueSources().map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="filterValue"
                    value={newTabData.filterValue}
                    onChange={(e) => setNewTabData(prev => ({ ...prev, filterValue: e.target.value }))}
                    placeholder="Enter text to search in notes"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tabColor">Tab Color</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="tabColor"
                    type="color"
                    value={newTabData.color}
                    onChange={(e) => setNewTabData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full sm:w-20 h-12 sm:h-10 cursor-pointer"
                  />
                  <Input
                    value={newTabData.color}
                    onChange={(e) => setNewTabData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateTabDialog(false)
                    setEditingTab(null)
                    setNewTabData({
                      name: '',
                      filterType: 'tag',
                      filterValue: '',
                      color: '#3B82F6'
                    })
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomTab}
                  disabled={!newTabData.name.trim() || savingTab}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingTab ? 'Saving...' : editingTab ? 'Update Tab' : 'Create Tab'}
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