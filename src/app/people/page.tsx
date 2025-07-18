'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Mail, Phone, Calendar, Clock, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { getPeople } from '@/lib/database'
import type { Person } from '@/lib/supabase'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'
import Link from 'next/link'

// Move loadFunction outside component to prevent recreation on every render
const loadPeopleData = async (userId: string, userRole: string) => {
  return await getPeople(userId, userRole)
}

export default function PeoplePage() {
  const { user, userRole } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Debug component lifecycle
  useEffect(() => {
    console.log('PeoplePage: Component mounted', {
      userId: user?.id,
      userRole,
      timestamp: new Date().toISOString(),
      url: window.location.pathname
    })

    return () => {
      console.log('PeoplePage: Component unmounted', {
        userId: user?.id,
        userRole,
        timestamp: new Date().toISOString(),
        url: window.location.pathname
      })
    }
  }, [user?.id, userRole])

  // Use the robust data loader
  const { data: people = [], loading, error, refetch } = useDataLoader(
    loadPeopleData,
    {
      cacheKey: 'people_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  const filteredPeople = (people || []).filter((person: Person) =>
    `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (person.email && person.email[0]?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">People</h2>
            <p className="text-muted-foreground">
              Manage your contacts and their information
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
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
            {filteredPeople.length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
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
                            {person.phone[0]}
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