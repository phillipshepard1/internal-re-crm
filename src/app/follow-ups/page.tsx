'use client'

import { useState, useEffect } from 'react'
import { getFollowUps, updateFollowUp, createFollowUp, createActivity, createNote, getPeople } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useDataLoader } from '@/hooks/useDataLoader'
import type { FollowUp, Person } from '@/lib/supabase';
type FollowUpWithPerson = FollowUp & { people?: Person };

const NEXT_FOLLOWUP_OPTIONS = [
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '2 Weeks', value: 14 },
  { label: '4 Weeks', value: 28 },
  { label: '6 Weeks', value: 42 },
]

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
  return date.toLocaleDateString('en-US', { weekday: 'short' })
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
  })
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
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week')
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

  const {
    currentData: paginatedFollowUps,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination<FollowUpWithPerson>({
    data: filteredFollowUps,
    itemsPerPage: 10
  })

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
            variant={viewMode === 'week' ? 'default' : 'outline'}
            onClick={() => setViewMode('week')}
          >
            Week View
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
          <Button className="flex items-center gap-2" variant="default" onClick={openScheduleModal}>
            <Plus className="h-4 w-4" />
            Schedule Follow-up
          </Button>
        </div>
              </div>
        
        {viewMode === 'week' ? (
          <WeekView 
            followUps={filteredFollowUps}
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
            onFollowUpClick={openInteractionModal}
          />
        ) : (
          <Card>
        <CardHeader>
          <CardTitle>All Follow-ups</CardTitle>
          <CardDescription>View and manage all your scheduled activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button variant={filter === 'upcoming' ? 'default' : 'outline'} onClick={() => setFilter('upcoming')}>Upcoming/Due</Button>
            <Button variant={filter === 'overdue' ? 'default' : 'outline'} onClick={() => setFilter('overdue')}>Missed/Overdue</Button>
          </div>
          {(error || localError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error || localError}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading follow-ups...</p>
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="p-6 text-muted-foreground text-center">
              No follow-ups found. Schedule your first follow-up to get started.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedFollowUps.map((fu: FollowUpWithPerson) => (
                <Card key={fu.id} className={`border ${isOverdue(fu) ? 'border-destructive' : ''}`}>
                  <CardHeader>
                    <CardTitle>
                      {fu.people ? `${fu.people.first_name} ${fu.people.last_name}` : 'Unknown Person'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">Type: <b>{fu.type}</b></div>
                    <div className="text-sm">Status: <b>{fu.status}</b></div>
                    <div className="text-sm">Scheduled: <b>{fu.scheduled_date ? new Date(fu.scheduled_date).toLocaleString() : 'N/A'}</b></div>
                    {fu.notes && <div className="text-sm mt-2">Notes: {fu.notes}</div>}
                    <Button className="mt-4" onClick={() => openInteractionModal(fu)}>
                      Add Interaction
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
          )}
        </CardContent>
      </Card>
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

// WeekView Component
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