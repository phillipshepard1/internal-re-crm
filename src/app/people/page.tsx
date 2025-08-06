
'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User, Upload, UserPlus, X, Loader2, Target, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { getRegularPeople, getConvertedLeads, getImportedLeads, bulkConvertPeopleToLeads } from '@/lib/database'
import type { Person } from '@/lib/supabase'
import { formatPhoneNumberForDisplay } from '@/lib/utils'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

// Load functions for different tabs
const loadRegularPeopleData = async (userId: string, userRole: string) => {
  return await getRegularPeople(userId, userRole)
}

const loadConvertedLeadsData = async (userId: string, userRole: string) => {
  return await getConvertedLeads(userId, userRole)
}

const loadImportedLeadsData = async (userId: string, userRole: string) => {
  return await getImportedLeads(userId, userRole)
}

export default function PeoplePage() {
  const { user, userRole } = useAuth()
  const [activeTab, setActiveTab] = useState('people')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const { toast } = useToast()

  // Data loaders for each tab
  const { 
    data: regularPeople = [], 
    loading: loadingRegularPeople, 
    error: errorRegularPeople, 
    refetch: refetchRegularPeople 
  } = useDataLoader(loadRegularPeopleData, {
    cacheKey: 'regular_people_data',
    cacheTimeout: 2 * 60 * 1000
  })

  const { 
    data: convertedLeads = [], 
    loading: loadingConvertedLeads, 
    error: errorConvertedLeads, 
    refetch: refetchConvertedLeads 
  } = useDataLoader(loadConvertedLeadsData, {
    cacheKey: 'converted_leads_data',
    cacheTimeout: 2 * 60 * 1000
  })

  const { 
    data: importedLeads = [], 
    loading: loadingImportedLeads, 
    error: errorImportedLeads, 
    refetch: refetchImportedLeads 
  } = useDataLoader(loadImportedLeadsData, {
    cacheKey: 'imported_leads_data',
    cacheTimeout: 2 * 60 * 1000
  })

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'people':
        return regularPeople || []
      case 'converted':
        return convertedLeads || []
      case 'imported':
        return importedLeads || []
      default:
        return regularPeople || []
    }
  }

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'people':
        return loadingRegularPeople
      case 'converted':
        return loadingConvertedLeads
      case 'imported':
        return loadingImportedLeads
      default:
        return loadingRegularPeople
    }
  }

  const getCurrentError = () => {
    switch (activeTab) {
      case 'people':
        return errorRegularPeople
      case 'converted':
        return errorConvertedLeads
      case 'imported':
        return errorImportedLeads
      default:
        return errorRegularPeople
    }
  }

  const getCurrentRefetch = () => {
    switch (activeTab) {
      case 'people':
        return refetchRegularPeople
      case 'converted':
        return refetchConvertedLeads
      case 'imported':
        return refetchImportedLeads
      default:
        return refetchRegularPeople
    }
  }

  const currentData = getCurrentData()
  const currentLoading = getCurrentLoading()
  const currentError = getCurrentError()
  const currentRefetch = getCurrentRefetch()

  // Filter data based on search query
  const filteredData = (currentData || []).filter((person: Person) => {
    if (!person || !person.first_name || !person.last_name) return false
    return `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (person.email && person.email[0]?.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const toggleSelectPerson = (personId: string) => {
    const newSelected = new Set(selectedPeople)
    if (newSelected.has(personId)) {
      newSelected.delete(personId)
    } else {
      newSelected.add(personId)
    }
    setSelectedPeople(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedPeople.size === paginatedData.length) {
      setSelectedPeople(new Set())
    } else {
      setSelectedPeople(new Set(paginatedData.map(p => p.id)))
    }
  }

  const convertToLeads = async () => {
    if (selectedPeople.size === 0) return

    setIsConverting(true)
    setConversionProgress(0)
    
    try {
      const selectedArray = Array.from(selectedPeople)
      const totalToConvert = selectedArray.length
      let successCount = 0

      // Use bulk conversion function
      const convertedPeople = await bulkConvertPeopleToLeads(selectedArray, user?.id || '')
      successCount = convertedPeople.length

      if (successCount === totalToConvert) {
        toast({
          title: 'Success',
          description: `Successfully converted ${successCount} people to leads. They are now in the staging area.`
        })
      } else {
        toast({
          title: 'Partial Success',
          description: `Converted ${successCount} out of ${totalToConvert} people to leads.`,
          variant: successCount === 0 ? 'destructive' : 'default'
        })
      }

      setSelectedPeople(new Set())
      // Refetch all tabs to update data
      refetchRegularPeople()
      refetchConvertedLeads()
      refetchImportedLeads()
    } catch (error) {
      console.error('Error converting to leads:', error)
      toast({
        title: 'Error',
        description: 'Failed to convert people to leads',
        variant: 'destructive'
      })
    } finally {
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const {
    currentData: paginatedData = [],
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination<Person>({
    data: filteredData || [],
    itemsPerPage: 10
  })

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedPeople(new Set())
  }, [activeTab])

  if (currentLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">People</h2>
            <p className="text-muted-foreground">
              Manage your contacts and their information
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading people...</p>
        </div>
      </div>
    )
  }

  if (currentError) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">People</h2>
            <p className="text-muted-foreground">
              Manage your contacts and their information
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{currentError}</AlertDescription>
          <Button onClick={currentRefetch} className="mt-4">
            Try Again
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">People</h2>
            <p className="text-muted-foreground">
              Manage your contacts and their information
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/people/import">
                    <Upload className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Import CSV</span>
                    <span className="sm:hidden">Import</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import multiple contacts from a CSV file</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/people/new">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Person</span>
                    <span className="sm:hidden">Add</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new contact to your CRM</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-3">
            <TabsTrigger value="people" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">People</span>
              <span className="sm:hidden">People</span>
              <span className="hidden sm:inline">({regularPeople?.length || 0})</span>
              <span className="sm:hidden">({regularPeople?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="converted" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Converted Leads</span>
              <span className="sm:hidden">Converted</span>
              <span className="hidden sm:inline">({convertedLeads?.length || 0})</span>
              <span className="sm:hidden">({convertedLeads?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="imported" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Imported Leads</span>
              <span className="sm:hidden">Imported</span>
              <span className="hidden sm:inline">({importedLeads?.length || 0})</span>
              <span className="sm:hidden">({importedLeads?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regular Contacts</CardTitle>
                <CardDescription>
                  General contacts and prospects (non-leads)
                </CardDescription>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm sm:text-base"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {selectedPeople.size > 0 && (
                  <div className="mb-4 p-4 bg-muted rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{selectedPeople.size} selected</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPeople(new Set())}
                      >
                        <X className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Clear selection</span>
                        <span className="sm:hidden">Clear</span>
                      </Button>
                    </div>
                    <Button
                      onClick={convertToLeads}
                      disabled={isConverting}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Convert to Leads</span>
                      <span className="sm:hidden">Convert</span>
                    </Button>
                  </div>
                )}
                {filteredData.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={paginatedData.length > 0 && selectedPeople.size === paginatedData.length}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Email</TableHead>
                            <TableHead className="hidden sm:table-cell">Phone</TableHead>
                            <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                            <TableHead className="hidden lg:table-cell">Next Follow-up</TableHead>
                            <TableHead className="hidden xl:table-cell">Last Interaction</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((person: Person) => (
                            <TableRow key={person.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPeople.has(person.id)}
                                  onCheckedChange={() => toggleSelectPerson(person.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <Link 
                                  href={`/people/${person.id}`}
                                  className="hover:underline text-primary"
                                >
                                  {person.first_name} {person.last_name}
                                </Link>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {person.email && person.email[0] ? (
                                  <div className="flex items-center">
                                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {person.email[0]}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {person.phone && person.phone[0] ? (
                                  <div className="flex items-center">
                                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {formatPhoneNumberForDisplay(person.phone[0])}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {person.assigned_user ? (
                                  <div className="flex items-center">
                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {person.assigned_user.first_name || person.assigned_user.email.split('@')[0]}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {person.next_follow_up ? (
                                  <div className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {new Date(person.next_follow_up).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden xl:table-cell">
                                {person.last_interaction ? (
                                  <div className="flex items-center">
                                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {new Date(person.last_interaction).toLocaleDateString()}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="secondary">
                                  {person.client_type || 'Contact'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link href={`/people/${person.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View contact details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4">
                      <DataTablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        onPageChange={goToPage}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                      />
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {searchQuery ? 'No people found matching your search' : 'No people found. Add your first contact to get started.'}
                    </AlertDescription>
                    {!searchQuery && (
                      <Button asChild className="mt-4">
                        <Link href="/people/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Contact
                        </Link>
                      </Button>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="converted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Converted Leads</CardTitle>
                <CardDescription>
                  Leads that have been converted to clients
                </CardDescription>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search converted leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm sm:text-base"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Last Interaction</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((person: Person) => (
                          <TableRow key={person.id}>
                            <TableCell className="font-medium">
                              <Link 
                                href={`/people/${person.id}`}
                                className="hover:underline text-primary"
                              >
                                {person.first_name} {person.last_name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {person.assigned_user ? (
                                <div className="flex items-center">
                                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {person.assigned_user.first_name || person.assigned_user.email.split('@')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.phone && person.phone[0] ? (
                                <div className="flex items-center">
                                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {formatPhoneNumberForDisplay(person.phone[0])}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.email && person.email[0] ? (
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {person.email[0]}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.last_interaction ? (
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {new Date(person.last_interaction).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/people/${person.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View contact details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <DataTablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        onPageChange={goToPage}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                      />
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {searchQuery ? 'No converted leads found matching your search' : 'No converted leads found.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="imported" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Imported Leads</CardTitle>
                <CardDescription>
                  People imported via CSV that were moved to leads
                </CardDescription>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search imported leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-sm sm:text-base"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredData.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Lead Status</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((person: Person) => (
                          <TableRow key={person.id}>
                            <TableCell className="font-medium">
                              <Link 
                                href={`/people/${person.id}`}
                                className="hover:underline text-primary"
                              >
                                {person.first_name} {person.last_name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {person.assigned_user ? (
                                <div className="flex items-center">
                                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {person.assigned_user.first_name || person.assigned_user.email.split('@')[0]}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {person.lead_status || 'staging'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {person.phone && person.phone[0] ? (
                                <div className="flex items-center">
                                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {formatPhoneNumberForDisplay(person.phone[0])}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.email && person.email[0] ? (
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {person.email[0]}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {person.created_at ? (
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {new Date(person.created_at).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/people/${person.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View contact details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <DataTablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        onPageChange={goToPage}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                      />
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {searchQuery ? 'No imported leads found matching your search' : 'No imported leads found.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
} 