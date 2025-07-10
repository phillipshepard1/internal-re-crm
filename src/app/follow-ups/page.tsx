'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, User, Phone, Mail, Clock, MessageSquare } from 'lucide-react'
import { getPeople, getFollowUps, createFollowUp, updateFollowUp, createNote, updatePerson } from '@/lib/database'
import type { Person, FollowUp } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

const nextFollowUpOptions = [
  { value: '3', label: '3 Days' },
  { value: '7', label: '1 Week' },
  { value: '14', label: '2 Weeks' },
  { value: '28', label: '4 Weeks' },
  { value: '42', label: '6 Weeks' },
]

export default function FollowUpsPage() {
  const { user, userRole } = useAuth()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('upcoming')
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [interactionNote, setInteractionNote] = useState('')
  const [nextFollowUpDays, setNextFollowUpDays] = useState('7')
  const [saving, setSaving] = useState(false)

  const loadPeople = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPeople(user?.id, userRole || undefined)
      // Filter people who have next_follow_up dates
      const peopleWithFollowUps = data.filter(person => person.next_follow_up)
      setPeople(peopleWithFollowUps)
    } catch (err) {
      setError('Failed to load people with follow-ups')
      console.error('Error loading people:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, userRole])

  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  const handleAddInteraction = (person: Person) => {
    setSelectedPerson(person)
    setInteractionNote('')
    setNextFollowUpDays('7')
    setShowInteractionModal(true)
  }

  const handleSaveInteraction = async () => {
    if (!selectedPerson || !interactionNote.trim()) return

    try {
      setSaving(true)
      
      // 1. Create a note about the interaction
      await createNote({
        title: `Follow-up Interaction - ${new Date().toLocaleDateString()}`,
        content: interactionNote,
        person_id: selectedPerson.id,
        created_by: user?.id || '',
      })

      // 2. Update the person's last_interaction
      const nextFollowUpDate = new Date()
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + parseInt(nextFollowUpDays))
      
      await updatePerson(selectedPerson.id, {
        last_interaction: new Date().toISOString(),
        next_follow_up: nextFollowUpDate.toISOString(),
      })

      // 3. Reload the people data
      await loadPeople()
      
      setShowInteractionModal(false)
      setSelectedPerson(null)
      setInteractionNote('')
      setNextFollowUpDays('7')
    } catch (err) {
      console.error('Error saving interaction:', err)
      alert('Failed to save interaction')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (nextFollowUp: string) => {
    const now = new Date()
    const scheduled = new Date(nextFollowUp)
    const diffTime = scheduled.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <Badge variant="destructive">Overdue</Badge>
    } else if (diffDays === 0) {
      return <Badge variant="default">Today</Badge>
    } else if (diffDays <= 7) {
      return <Badge variant="secondary">This Week</Badge>
    } else {
      return <Badge variant="outline">Upcoming</Badge>
    }
  }

  const getFilteredPeople = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    if (activeTab === 'upcoming') {
      return people.filter(person => {
        if (!person.next_follow_up) return false
        const followUpDate = new Date(person.next_follow_up)
        return followUpDate >= today
      })
    } else {
      return people.filter(person => {
        if (!person.next_follow_up) return false
        const followUpDate = new Date(person.next_follow_up)
        return followUpDate < today
      })
    } 1 
  }

  const filteredPeople = getFilteredPeople()

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Follow-ups</h2>
            <p className="text-muted-foreground">
              Manage your scheduled follow-ups and interactions
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading follow-ups...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Follow-ups</h2>
            <p className="text-muted-foreground">
              Manage your scheduled follow-ups and interactions
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          <Button onClick={loadPeople} className="mt-4">
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
            <h2 className="text-3xl font-bold tracking-tight">Follow-ups</h2>
            <p className="text-muted-foreground">
              Manage your scheduled follow-ups and interactions
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming/Due ({people.filter(p => {
                if (!p.next_follow_up) return false
                const followUpDate = new Date(p.next_follow_up)
                const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
                return followUpDate >= today
              }).length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Missed/Overdue ({people.filter(p => {
                if (!p.next_follow_up) return false
                const followUpDate = new Date(p.next_follow_up)
                const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
                return followUpDate < today
              }).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Follow-ups</CardTitle>
                <CardDescription>
                  People you need to follow up with in the coming days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPeople.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Next Follow-up</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Last Interaction</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeople.map((person) => (
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
                            {person.next_follow_up && (
                              <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                {new Date(person.next_follow_up).toLocaleDateString()}
                              </div>
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
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {person.next_follow_up && getStatusBadge(person.next_follow_up)}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleAddInteraction(person)}
                                >
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Add Interaction
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Log an interaction and schedule next follow-up</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No upcoming follow-ups</h3>
                    <p className="text-muted-foreground">
                      All your follow-ups are up to date!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Follow-ups</CardTitle>
                <CardDescription>
                  People you need to follow up with (past due date)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPeople.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Last Interaction</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeople.map((person) => {
                        const dueDate = person.next_follow_up ? new Date(person.next_follow_up) : null
                        const daysOverdue = dueDate ? Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
                        
                        return (
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
                              {dueDate && (
                                <div className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {dueDate.toLocaleDateString()}
                                </div>
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
                                <span className="text-muted-foreground">Never</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleAddInteraction(person)}
                                  >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Add Interaction
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Log an interaction and schedule next follow-up</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No overdue follow-ups</h3>
                    <p className="text-muted-foreground">
                      Great job staying on top of your follow-ups!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Interaction Modal */}
        <Dialog open={showInteractionModal} onOpenChange={setShowInteractionModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Interaction</DialogTitle>
              <DialogDescription>
                Log your interaction with {selectedPerson?.first_name} {selectedPerson?.last_name} and schedule the next follow-up.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="interactionNote" className="text-sm font-medium">
                  Interaction Notes
                </label>
                <Textarea
                  id="interactionNote"
                  value={interactionNote}
                  onChange={(e) => setInteractionNote(e.target.value)}
                  placeholder="Describe your interaction (e.g., 'Left voicemail, will try again', 'Spoke with client about proposal')"
                  rows={4}
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="nextFollowUp" className="text-sm font-medium">
                  Schedule Next Follow-up
                </label>
                <Select value={nextFollowUpDays} onValueChange={setNextFollowUpDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nextFollowUpOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInteractionModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveInteraction} 
                disabled={!interactionNote.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Interaction'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 