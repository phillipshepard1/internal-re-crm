
'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User, Upload, UserPlus, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { getPeople, updatePerson } from '@/lib/database'
import type { Person } from '@/lib/supabase'
import { formatPhoneNumberForDisplay } from '@/lib/utils'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

// Move loadFunction outside component to prevent recreation on every render
const loadPeopleData = async (userId: string, userRole: string) => {
  return await getPeople(userId, userRole)
}

export default function PeoplePage() {
  const { user, userRole } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set())
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const { toast } = useToast()

  // Debug component lifecycle
  useEffect(() => {
    // Component mounted
    return () => {
      // Component unmounted
    }
  }, [])

  // Use the robust data loader
  const { data: people = [], loading, error, refetch } = useDataLoader(
    loadPeopleData,
    {
      cacheKey: 'people_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  // Debug: Log the data being loaded
  useEffect(() => {
    if (people) {
      // Data loaded
    }
  }, [people])

  const filteredPeople = (people || []).filter((person: Person) =>
    `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (person.email && person.email[0]?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
    if (selectedPeople.size === paginatedPeople.length) {
      setSelectedPeople(new Set())
    } else {
      setSelectedPeople(new Set(paginatedPeople.map(p => p.id)))
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

      for (let i = 0; i < selectedArray.length; i++) {
        try {
          await updatePerson(selectedArray[i], {
            client_type: 'lead',
            lead_status: 'staging'
          })
          successCount++
        } catch (error) {
          console.error(`Failed to convert person ${selectedArray[i]}:`, error)
        }
        
        setConversionProgress(((i + 1) / totalToConvert) * 100)
      }

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
      refetch()
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
    currentData: paginatedPeople,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination<Person>({
    data: filteredPeople,
    itemsPerPage: 10
  })

  if (loading) {
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

  if (error) {
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
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          <Button onClick={refetch} className="mt-4">
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
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild>
                  <Link href="/people/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
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
                    Add Person
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new contact to your CRM</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              Search and manage your contacts
            </CardDescription>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {selectedPeople.size > 0 && (
              <div className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{selectedPeople.size} selected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPeople(new Set())}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear selection
                  </Button>
                </div>
                <Button
                  onClick={convertToLeads}
                  disabled={isConverting}
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convert to Leads
                </Button>
              </div>
            )}
            {filteredPeople.length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={paginatedPeople.length > 0 && selectedPeople.size === paginatedPeople.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Next Follow-up</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Last Interaction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedPeople.map((person: Person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPeople.has(person.id)}
                          onCheckedChange={() => toggleSelectPerson(person.id)}
                          disabled={person.client_type === 'lead'}
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
                        {person.next_follow_up ? (
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            {new Date(person.next_follow_up).toLocaleDateString()}
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
      </div>
    </TooltipProvider>
  )
} 