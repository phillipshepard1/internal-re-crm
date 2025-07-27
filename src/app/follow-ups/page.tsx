'use client'

import { useState, useEffect } from 'react'
import { getFollowUps, updateFollowUp, createFollowUp, createActivity, createNote, getPeople } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useDataLoader } from '@/hooks/useDataLoader'
import type { FollowUp, Person } from '@/lib/supabase';

type FollowUpWithPerson = FollowUp & { people?: Person };

const FOLLOWUP_TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Task', value: 'task' },
  { label: 'Other', value: 'other' },
]

function isOverdue(fu: FollowUpWithPerson) {
  return fu.status !== 'completed' && new Date(fu.scheduled_date) < new Date()
}

// Helper functions for week-based view
function getWeekDays(startDate: Date): Date[] {
  const days = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push(day)
  }
  return days
}

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function getDayNumber(date: Date): string {
  return date.getDate().toString()
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}

function getFollowUpsForDay(followUps: FollowUpWithPerson[], date: Date): FollowUpWithPerson[] {
  return followUps.filter(fu => {
    const followUpDate = new Date(fu.scheduled_date)
    return isSameDay(followUpDate, date) && fu.status !== 'completed'
  }).sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Move loadFunction outside component to prevent recreation on every render
const loadFollowUpsData = async (userId: string, userRole: string) => {
  return await getFollowUps(userId, userRole)
}

export default function FollowUpsPage() {
  const { user, userRole } = useAuth()
  const [filter, setFilter] = useState<'upcoming' | 'overdue'>('upcoming')
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list') // Keep list as default
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    return startOfWeek
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUpWithPerson | null>(null)
  const [interactionNote, setInteractionNote] = useState('')
  const [saving, setSaving] = useState(false)
  // New state for scheduling follow-up
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [peopleOptions, setPeopleOptions] = useState<Person[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [followUpType, setFollowUpType] = useState<'call' | 'email' | 'meeting' | 'task' | 'other'>('call')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Use the robust data loader
  const { data: followUps, loading, error, refetch } = useDataLoader(
    loadFollowUpsData,
    {
      cacheKey: 'followups_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  const followUpsArray = followUps || []

  const filteredFollowUps = followUpsArray.filter((fu: FollowUpWithPerson) =>
    filter === 'upcoming'
      ? fu.status !== 'completed' && new Date(fu.scheduled_date) >= new Date()
      : isOverdue(fu)
  )

  // Load people for the person selector
  useEffect(() => {
    async function loadPeople() {
      try {
        const data = await getPeople(user?.id, userRole || undefined)
        setPeopleOptions(data)
      } catch {}
    }
    if (scheduleModalOpen) loadPeople()
  }, [scheduleModalOpen, user?.id, userRole])

  const openInteractionModal = (fu: FollowUpWithPerson) => {
    setActiveFollowUp(fu)
    setInteractionNote('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setActiveFollowUp(null)
    setInteractionNote('')
  }

  const handleSaveInteraction = async () => {
    if (!activeFollowUp) return
    setSaving(true)
    try {
      // 1. Mark current follow-up as done
      await updateFollowUp(activeFollowUp.id, { status: 'completed' })
      // 2. Save note to activity and notes
      if (interactionNote.trim()) {
        await createActivity({
          person_id: activeFollowUp.people?.id,
          type: 'follow_up',
          description: interactionNote,
          created_by: user?.id,
        })
        await createNote({
          person_id: activeFollowUp.people?.id,
          title: 'Follow-up Interaction',
          content: interactionNote,
          created_by: user?.id,
        })
      }
      // 3. Schedule next follow-up using the person's frequency settings
      if (activeFollowUp.people?.id) {
        // Use the database function to create the next follow-up based on frequency
        const { data, error } = await supabase.rpc('create_next_followup_for_person', {
          person_id: activeFollowUp.people.id
        })
        
        if (error) {
          console.error('Error creating next follow-up:', error)
        }
      }
      // 4. Refresh list
      refetch()
      closeModal()
    } catch {
      setLocalError('Failed to save interaction')
    } finally {
      setSaving(false)
    }
  }

  // Add this handler for opening the schedule modal
  const openScheduleModal = () => {
    setSelectedPersonId('')
    setScheduledDate('')
    setFollowUpType('call')
    setScheduleNotes('')
    setScheduleModalOpen(true)
  }
  const closeScheduleModal = () => {
    setScheduleModalOpen(false)
  }
  const handleScheduleFollowUp = async () => {
    if (!selectedPersonId || !scheduledDate) return
    setScheduleSaving(true)
    try {
      await createFollowUp({
        person_id: selectedPersonId,
        scheduled_date: new Date(scheduledDate).toISOString(),
        status: 'pending',
        type: followUpType,
        notes: scheduleNotes,
      })
      refetch()
      closeScheduleModal()
    } catch {
      setLocalError('Failed to schedule follow-up')
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground text-lg mt-1">Manage your scheduled activities and reminders</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            List View
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Week View
          </Button>
          <Button className="flex items-center gap-2" variant="default" onClick={openScheduleModal}>
            <Plus className="h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
      </div>
        
      {viewMode === 'list' ? (
        <WeeklyListView 
          followUps={filteredFollowUps}
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          onFollowUpClick={openInteractionModal}
          filter={filter}
          setFilter={setFilter}
          loading={loading}
          error={error}
          localError={localError}
        />
      ) : (
        <WeekView 
          followUps={filteredFollowUps}
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          onFollowUpClick={openInteractionModal}
        />
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Interaction & Schedule Next Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={interactionNote}
              onChange={e => setInteractionNote(e.target.value)}
              placeholder="Write a note about this interaction..."
              rows={4}
            />
            <div>
              <p className="text-sm text-muted-foreground">
                Next follow-up will be automatically scheduled based on the person's frequency settings.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveInteraction} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Person</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
              >
                <option value="">Select a person</option>
                {peopleOptions.map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Date</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Type</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={followUpType}
                onChange={e => setFollowUpType(e.target.value as 'call' | 'email' | 'meeting' | 'task' | 'other')}
              >
                {FOLLOWUP_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Notes</label>
              <Textarea
                value={scheduleNotes}
                onChange={e => setScheduleNotes(e.target.value)}
                placeholder="Add notes for this follow-up..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleScheduleFollowUp} disabled={scheduleSaving || !selectedPersonId || !scheduledDate}>
              {scheduleSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={closeScheduleModal} disabled={scheduleSaving}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Weekly List View Component - Redesigned for workflow
interface WeeklyListViewProps {
  followUps: FollowUpWithPerson[]
  currentWeek: Date
  onWeekChange: (date: Date) => void
  onFollowUpClick: (followUp: FollowUpWithPerson) => void
  filter: 'upcoming' | 'overdue'
  setFilter: (filter: 'upcoming' | 'overdue') => void
  loading: boolean
  error: string | null
  localError: string | null
}

function WeeklyListView({ 
  followUps, 
  currentWeek, 
  onWeekChange, 
  onFollowUpClick, 
  filter, 
  setFilter, 
  loading, 
  error, 
  localError 
}: WeeklyListViewProps) {
  const weekDays = getWeekDays(currentWeek)
  
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    onWeekChange(newWeek)
  }
  
  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    onWeekChange(newWeek)
  }
  
  const goToCurrentWeek = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    onWeekChange(startOfWeek)
  }

  // Get all follow-ups for the week in one unified list
  const weeklyFollowUps = weekDays.flatMap(day => {
    const dayFollowUps = getFollowUpsForDay(followUps, day)
    return dayFollowUps.map(followUp => ({ ...followUp, day }))
  })

  const hasFollowUpsInWeek = weeklyFollowUps.length > 0

  return (
    <div className="space-y-6">
      {/* Week Navigation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Weekly Follow-ups</CardTitle>
              <CardDescription>
                {currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Week of {currentWeek.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                ← Previous Week
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                Next Week →
              </Button>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant={filter === 'upcoming' ? 'default' : 'outline'} 
              onClick={() => setFilter('upcoming')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Upcoming/Due
            </Button>
            <Button 
              variant={filter === 'overdue' ? 'default' : 'outline'} 
              onClick={() => setFilter('overdue')}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Missed/Overdue
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {(error || localError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || localError}</AlertDescription>
        </Alert>
      )}
      
      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading follow-ups...</p>
          </CardContent>
        </Card>
      ) : !hasFollowUpsInWeek ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No follow-ups this week</h3>
            <p className="text-muted-foreground mb-4">
              Schedule your first follow-up to get started with your workflow.
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Follow-up
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Unified Weekly List - No Pagination */
        <div className="space-y-4">
          {weekDays.map((day, index) => {
            const dayFollowUps = getFollowUpsForDay(followUps, day)
            const isCurrentDay = isToday(day)
            
            if (dayFollowUps.length === 0) return null
            
            return (
              <Card key={index} className={`${isCurrentDay ? 'ring-2 ring-primary/20' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`text-lg font-semibold ${
                        isCurrentDay ? 'text-primary' : 'text-foreground'
                      }`}>
                        {getDayName(day)}
                      </div>
                      <Badge variant={isCurrentDay ? 'default' : 'secondary'}>
                        {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                      {isCurrentDay && (
                        <Badge variant="default" className="bg-primary">
                          Today
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dayFollowUps.length} follow-up{dayFollowUps.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {dayFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                          isOverdue(followUp) 
                            ? 'border-destructive/50 bg-destructive/5 hover:border-destructive' 
                            : 'border-border hover:bg-muted/30'
                        }`}
                        onClick={() => onFollowUpClick(followUp)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {followUp.people ? `${followUp.people.first_name} ${followUp.people.last_name}` : 'Unknown Person'}
                              </div>
                              {followUp.people?.company && (
                                <div className="text-sm text-muted-foreground">
                                  {followUp.people.company}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={
                                followUp.type === 'call' ? 'default' :
                                followUp.type === 'email' ? 'secondary' :
                                followUp.type === 'meeting' ? 'outline' :
                                'secondary'
                              }
                              className="capitalize"
                            >
                              {followUp.type}
                            </Badge>
                            {isOverdue(followUp) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(followUp.scheduled_date).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                            </div>
                            {followUp.people?.lead_source && (
                              <div className="flex items-center space-x-1">
                                <span>•</span>
                                <span>{followUp.people.lead_source}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {followUp.notes && (
                          <div className="mt-3 text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                            {followUp.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// WeekView Component (Calendar Grid View)
interface WeekViewProps {
  followUps: FollowUpWithPerson[]
  currentWeek: Date
  onWeekChange: (date: Date) => void
  onFollowUpClick: (followUp: FollowUpWithPerson) => void
}

function WeekView({ followUps, currentWeek, onWeekChange, onFollowUpClick }: WeekViewProps) {
  const weekDays = getWeekDays(currentWeek)
  
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    onWeekChange(newWeek)
  }
  
  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    onWeekChange(newWeek)
  }
  
  const goToCurrentWeek = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
    onWeekChange(startOfWeek)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Week View</CardTitle>
            <CardDescription>
              {currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Week of {currentWeek.toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              ← Previous
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              Next →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayFollowUps = getFollowUpsForDay(followUps, day)
            const isCurrentDay = isToday(day)
            
            return (
              <div 
                key={index} 
                className={`p-3 border rounded-lg min-h-[120px] ${
                  isCurrentDay ? 'bg-primary/10 border-primary' : 'bg-muted/20'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    {getDayName(day)}
                  </div>
                  <div className={`text-lg font-bold ${
                    isCurrentDay ? 'text-primary' : ''
                  }`}>
                    {getDayNumber(day)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {dayFollowUps.map((followUp) => (
                    <div
                      key={followUp.id}
                      className="p-2 bg-background border rounded text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => onFollowUpClick(followUp)}
                    >
                      <div className="font-medium truncate">
                        {followUp.people ? `${followUp.people.first_name} ${followUp.people.last_name}` : 'Unknown'}
                      </div>
                      <div className="text-muted-foreground capitalize">
                        {followUp.type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
} 