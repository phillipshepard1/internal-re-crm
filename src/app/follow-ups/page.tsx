'use client'

import { useState, useEffect } from 'react'
import { getFollowUps, updateFollowUp, createFollowUp, deleteFollowUp, createActivity, createNote, getPeople, getNotes, updatePerson, getFrequencyDisplayName, getDayOfWeekDisplayName, getLeadTags, updateLeadTagForLead } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Clock, User, CheckCircle, AlertCircle, Phone, MessageSquare, FileText, Check, X, Settings, Edit, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useDataLoader } from '@/hooks/useDataLoader'
import type { FollowUp, Person, Note } from '@/lib/supabase';

type FollowUpWithPerson = FollowUp & { people?: Person };

const FOLLOWUP_TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Task', value: 'task' },
  { label: 'Other', value: 'other' },
]

const FREQUENCY_OPTIONS = [
  { label: 'Twice a Week', value: 'twice_week' },
  { label: 'Every Week', value: 'weekly' },
  { label: 'Every 2 Weeks', value: 'biweekly' },
  { label: 'Every Month', value: 'monthly' },
]

const DAY_OF_WEEK_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
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
  
  // New state for enhanced UI features
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [selectedPersonNotes, setSelectedPersonNotes] = useState<Note[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [interactionType, setInteractionType] = useState<'call' | 'text' | null>(null)
  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  const [interactionNotes, setInteractionNotes] = useState('')
  
  // New state for frequency editing
  const [frequencyModalOpen, setFrequencyModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [selectedFrequency, setSelectedFrequency] = useState<'twice_week' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1)
  const [frequencySaving, setFrequencySaving] = useState(false)
  
  // New state for completion confirmation
  const [completionModalOpen, setCompletionModalOpen] = useState(false)
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUpWithPerson | null>(null)
  
  // New state for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingFollowUp, setDeletingFollowUp] = useState<FollowUpWithPerson | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // New state for lead tag editing
  const [leadTags, setLeadTags] = useState<any[]>([])
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [editingPersonForTag, setEditingPersonForTag] = useState<Person | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [tagSaving, setTagSaving] = useState(false)
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

  // Use the robust data loader
  const { data: followUps, loading, error, refetch } = useDataLoader(
    loadFollowUpsData,
    {
      cacheKey: 'followups_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  const followUpsArray = followUps || []

  // Debug logging for follow-ups data
  useEffect(() => {
    if (followUpsArray.length > 0) {
      console.log('Follow-ups data:', followUpsArray)
      console.log('User role:', userRole)
      console.log('User ID:', user?.id)
      // Check if any follow-ups have lead tags
      // const followUpsWithTags = followUpsArray.filter((fu: FollowUpWithPerson) => fu.people?.lead_tag)
      // console.log('Follow-ups with lead tags:', followUpsWithTags)
    }
  }, [followUpsArray, userRole, user?.id])

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

  // Load lead tags
  useEffect(() => {
    async function loadLeadTags() {
      try {
        const tags = await getLeadTags()
        setLeadTags(tags)
        console.log('Loaded lead tags:', tags)
      } catch (error) {
        console.error('Error loading lead tags:', error)
      }
    }
    loadLeadTags()
  }, [])

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

  // New handlers for enhanced UI features
  const openNotesModal = async (person: Person) => {
    try {
      const notes = await getNotes(person.id)
      setSelectedPersonNotes(notes)
      setSelectedPerson(person)
      setNotesModalOpen(true)
    } catch (error) {
      console.error('Error loading notes:', error)
      setLocalError('Failed to load notes')
    }
  }

  const closeNotesModal = () => {
    setNotesModalOpen(false)
    setSelectedPersonNotes([])
    setSelectedPerson(null)
  }

  const openEnhancedInteractionModal = (followUp: FollowUpWithPerson, type: 'call' | 'text') => {
    setActiveFollowUp(followUp)
    setInteractionType(type)
    setInteractionNotes('')
    setInteractionModalOpen(true)
  }

  const closeInteractionModal = () => {
    setInteractionModalOpen(false)
    setActiveFollowUp(null)
    setInteractionType(null)
    setInteractionNotes('')
  }

  const handleSaveEnhancedInteraction = async () => {
    if (!activeFollowUp || !interactionType) return
    setSaving(true)
    try {
      // 1. Mark current follow-up as completed
      await updateFollowUp(activeFollowUp.id, { status: 'completed' })
      
      // 2. Create activity and note for the interaction
      const interactionDescription = `${interactionType === 'call' ? 'Phone Call' : 'Text Message'}: ${interactionNotes.trim() || 'No notes provided'}`
      
      await createActivity({
        person_id: activeFollowUp.people?.id,
        type: 'follow_up',
        description: interactionDescription,
        created_by: user?.id,
      })
      
      if (interactionNotes.trim()) {
        await createNote({
          person_id: activeFollowUp.people?.id,
          title: `${interactionType === 'call' ? 'Phone Call' : 'Text Message'} - Follow-up`,
          content: interactionNotes,
          created_by: user?.id,
        })
      }
      
      // 3. Schedule next follow-up using the person's frequency settings
      if (activeFollowUp.people?.id) {
        const { data, error } = await supabase.rpc('create_next_followup_for_person', {
          person_id: activeFollowUp.people.id
        })
        
        if (error) {
          console.error('Error creating next follow-up:', error)
        }
      }
      
      // 4. Refresh list
      refetch()
      closeInteractionModal()
    } catch (error) {
      console.error('Error saving interaction:', error)
      setLocalError('Failed to save interaction')
    } finally {
      setSaving(false)
    }
  }

  // New handlers for frequency editing
  const openFrequencyModal = (person: Person) => {
    setEditingPerson(person)
    setSelectedFrequency(person.follow_up_frequency || 'weekly')
    setSelectedDayOfWeek(person.follow_up_day_of_week || 1)
    setFrequencyModalOpen(true)
  }

  const closeFrequencyModal = () => {
    setFrequencyModalOpen(false)
    setEditingPerson(null)
  }

  const handleSaveFrequency = async () => {
    if (!editingPerson) return
    setFrequencySaving(true)
    try {
      await updatePerson(editingPerson.id, {
        follow_up_frequency: selectedFrequency,
        follow_up_day_of_week: selectedDayOfWeek,
        updated_at: new Date().toISOString()
      })
      
      // Create activity log
      await createActivity({
        person_id: editingPerson.id,
        type: 'status_changed',
        description: `Follow-up frequency updated to ${getFrequencyDisplayName(selectedFrequency)} on ${getDayOfWeekDisplayName(selectedDayOfWeek)}`,
        created_by: user?.id,
      })
      
      refetch()
      closeFrequencyModal()
    } catch (error) {
      console.error('Error updating frequency:', error)
      setLocalError('Failed to update frequency')
    } finally {
      setFrequencySaving(false)
    }
  }

  // New handlers for completion confirmation
  const openCompletionModal = (followUp: FollowUpWithPerson) => {
    setCompletingFollowUp(followUp)
    setCompletionModalOpen(true)
  }

  const closeCompletionModal = () => {
    setCompletionModalOpen(false)
    setCompletingFollowUp(null)
  }

  const handleConfirmCompletion = async () => {
    if (!completingFollowUp) return
    try {
      await updateFollowUp(completingFollowUp.id, { status: 'completed' })
      
      // Schedule next follow-up if person has frequency settings
      if (completingFollowUp.people?.id) {
        const { data, error } = await supabase.rpc('create_next_followup_for_person', {
          person_id: completingFollowUp.people.id
        })
        
        if (error) {
          console.error('Error creating next follow-up:', error)
        }
      }
      
      refetch()
      closeCompletionModal()
    } catch (error) {
      console.error('Error completing follow-up:', error)
      setLocalError('Failed to complete follow-up')
    }
  }

  // New handlers for delete functionality
  const openDeleteModal = (followUp: FollowUpWithPerson) => {
    setDeletingFollowUp(followUp)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteModalOpen(false)
    setDeletingFollowUp(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingFollowUp) return
    setDeleting(true)
    try {
      await deleteFollowUp(deletingFollowUp.id)
      refetch()
      closeDeleteModal()
      setAlertModal({
        open: true,
        title: 'Follow-up Deleted',
        message: 'The follow-up has been successfully deleted.',
        type: 'success'
      })
    } catch (error) {
      console.error('Error deleting follow-up:', error)
      setLocalError('Failed to delete follow-up')
    } finally {
      setDeleting(false)
    }
  }

  // New handlers for lead tag editing
  const openTagModal = (person: Person) => {
    setEditingPersonForTag(person)
    setSelectedTagId(person.lead_tag_id || 'none')
    setTagModalOpen(true)
  }

  const closeTagModal = () => {
    setTagModalOpen(false)
    setEditingPersonForTag(null)
    setSelectedTagId('none')
  }

  const handleSaveTag = async () => {
    if (!editingPersonForTag || !user?.id) return
    setTagSaving(true)
    try {
      // Convert "none" to null for removing the tag
      const tagId = selectedTagId === "none" ? null : selectedTagId
      await updateLeadTagForLead(editingPersonForTag.id, tagId, user.id)
      refetch()
      closeTagModal()
      setAlertModal({
        open: true,
        title: 'Lead Tag Updated',
        message: 'The lead tag has been successfully updated.',
        type: 'success'
      })
    } catch (error) {
      console.error('Error updating lead tag:', error)
      setLocalError('Failed to update lead tag')
    } finally {
      setTagSaving(false)
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
          onMarkCompleted={openCompletionModal}
          onOpenNotes={openNotesModal}
          onOpenInteraction={openEnhancedInteractionModal}
          onOpenFrequency={openFrequencyModal}
          onOpenTag={openTagModal}
          onDeleteFollowUp={openDeleteModal}
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

      {/* Original Interaction Modal */}
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

      {/* Enhanced Interaction Modal */}
      <Dialog open={interactionModalOpen} onOpenChange={setInteractionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {interactionType === 'call' ? 'Phone Call' : 'Text Message'} - {activeFollowUp?.people ? `${activeFollowUp.people.first_name} ${activeFollowUp.people.last_name}` : 'Unknown Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                {interactionType === 'call' ? <Phone className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
                <span className="font-medium">
                  {interactionType === 'call' ? 'Phone Call' : 'Text Message'} Interaction
                </span>
              </div>
            </div>
            <Textarea
              value={interactionNotes}
              onChange={e => setInteractionNotes(e.target.value)}
              placeholder={`Add notes about this ${interactionType === 'call' ? 'phone call' : 'text message'}...`}
              rows={4}
            />
            <div>
              <p className="text-sm text-muted-foreground">
                This will mark the follow-up as completed and schedule the next one based on frequency settings.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEnhancedInteraction} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Complete'}
            </Button>
            <Button variant="outline" onClick={closeInteractionModal} disabled={saving}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Modal */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Notes - {selectedPerson ? `${selectedPerson.first_name} ${selectedPerson.last_name}` : 'Unknown Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPersonNotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notes found for this person.</p>
              </div>
            ) : (
              selectedPersonNotes.map((note) => (
                <Card key={note.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{note.title}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeNotesModal}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Frequency Editing Modal */}
      <Dialog open={frequencyModalOpen} onOpenChange={setFrequencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Follow-up Frequency - {editingPerson ? `${editingPerson.first_name} ${editingPerson.last_name}` : 'Unknown Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Follow-up Frequency</Label>
              <Select value={selectedFrequency} onValueChange={(value: 'twice_week' | 'weekly' | 'biweekly' | 'monthly') => setSelectedFrequency(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Preferred Day of Week</Label>
              <Select value={String(selectedDayOfWeek)} onValueChange={(value) => setSelectedDayOfWeek(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose day of week" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OF_WEEK_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Current Setting:</strong> {getFrequencyDisplayName(selectedFrequency)} on {getDayOfWeekDisplayName(selectedDayOfWeek)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveFrequency} disabled={frequencySaving}>
              {frequencySaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={closeFrequencyModal} disabled={frequencySaving}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Modal */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Follow-up Completion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to mark this follow-up as completed?</p>
            {completingFollowUp && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">
                  {completingFollowUp.people ? `${completingFollowUp.people.first_name} ${completingFollowUp.people.last_name}` : 'Unknown Person'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {completingFollowUp.type} - {new Date(completingFollowUp.scheduled_date).toLocaleDateString()}
                </p>
                {completingFollowUp.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Notes: {completingFollowUp.notes}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This will mark the follow-up as completed and automatically schedule the next one based on the person's frequency settings.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmCompletion} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
            <Button variant="outline" onClick={closeCompletionModal}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete this follow-up?</p>
            {deletingFollowUp && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">
                  {deletingFollowUp.people ? `${deletingFollowUp.people.first_name} ${deletingFollowUp.people.last_name}` : 'Unknown Person'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deletingFollowUp.type} - {new Date(deletingFollowUp.scheduled_date).toLocaleDateString()}
                </p>
                {deletingFollowUp.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Notes: {deletingFollowUp.notes}
                  </p>
                )}
                <p className="text-sm text-destructive mt-2">
                  <strong>Warning:</strong> This action cannot be undone.
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This will permanently delete the follow-up. No new follow-up will be automatically scheduled.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Follow-up'}
            </Button>
            <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Tag Editing Modal */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Lead Tag - {editingPersonForTag ? `${editingPersonForTag.first_name} ${editingPersonForTag.last_name}` : 'Unknown Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="leadTag">Lead Tag</Label>
              <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tag</SelectItem>
                  {leadTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Current Tag:</strong> {editingPersonForTag?.lead_tag?.name || 'No tag assigned'}
              </p>
              {editingPersonForTag?.lead_tag?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {editingPersonForTag.lead_tag.description}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTag} disabled={tagSaving}>
              {tagSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={closeTagModal} disabled={tagSaving}>Cancel</Button>
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

      {/* Alert Modal for Success/Error Messages */}
      {alertModal.open && (
        <Dialog open={alertModal.open} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{alertModal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>{alertModal.message}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Weekly List View Component - Redesigned for workflow
interface WeeklyListViewProps {
  followUps: FollowUpWithPerson[]
  currentWeek: Date
  onWeekChange: (date: Date) => void
  onFollowUpClick: (followUp: FollowUpWithPerson) => void
  onMarkCompleted: (followUp: FollowUpWithPerson) => void
  onOpenNotes: (person: Person) => void
  onOpenInteraction: (followUp: FollowUpWithPerson, type: 'call' | 'text') => void
  onOpenFrequency: (person: Person) => void
  onOpenTag: (person: Person) => void
  onDeleteFollowUp: (followUp: FollowUpWithPerson) => void
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
  onMarkCompleted,
  onOpenNotes,
  onOpenInteraction,
  onOpenFrequency,
  onOpenTag,
  onDeleteFollowUp,
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
              <CardTitle className="text-2xl">Weekly Follow-ups</CardTitle>
              <CardDescription className="text-lg">
                {currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Week of {currentWeek.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayFollowUps.map((followUp) => (
                      <div
                        key={followUp.id}
                        className={`p-4 border rounded-lg transition-all hover:shadow-md hover:border-primary/50 ${
                          isOverdue(followUp) 
                            ? 'border-destructive/50 bg-destructive/5 hover:border-destructive' 
                            : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">
                                {followUp.people ? `${followUp.people.first_name} ${followUp.people.last_name}` : 'Unknown Person'}
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                {followUp.people?.company && (
                                  <span className="truncate">{followUp.people.company}</span>
                                )}
                                {followUp.people?.follow_up_frequency && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {getFrequencyDisplayName(followUp.people.follow_up_frequency)}
                                      {followUp.people.follow_up_day_of_week !== null && followUp.people.follow_up_day_of_week !== undefined && (
                                        <span className="ml-1">({getDayOfWeekDisplayName(followUp.people.follow_up_day_of_week)})</span>
                                      )}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* <div className="flex items-center space-x-2 flex-shrink-0">
                            <Badge 
                              variant={
                                followUp.type === 'call' ? 'default' :
                                followUp.type === 'email' ? 'secondary' :
                                followUp.type === 'meeting' ? 'outline' :
                                'secondary'
                              }
                              className="capitalize"
                            >
                              {followUp.type === 'call' ? 'Phone' : followUp.type}
                            </Badge>
                            {isOverdue(followUp) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div> */}
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground min-w-0 flex-1">
                            <div className="flex items-center space-x-1 flex-shrink-0">
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
                              <div className="flex items-center space-x-1 min-w-0">
                                <span>•</span>
                                <span className="truncate">{followUp.people.lead_source}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {followUp.notes && (
                          <div className="mb-3 text-sm text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded max-h-16 overflow-hidden">
                            {followUp.notes}
                          </div>
                        )}
                        
                        {/* Enhanced Action Buttons */}
                        <div className="flex flex-col space-y-2 pt-2 border-t border-border/50">
                          {/* Primary Actions Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenInteraction(followUp, 'call')}
                                className="flex items-center gap-1 h-8 px-2"
                              >
                                <Phone className="h-3 w-3" />
                                <span className="hidden sm:inline">Call</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenInteraction(followUp, 'text')}
                                className="flex items-center gap-1 h-8 px-2"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span className="hidden sm:inline">Text</span>
                              </Button>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onFollowUpClick(followUp)}
                                className="flex items-center gap-1 h-8 px-2"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="hidden sm:inline">Note</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => onMarkCompleted(followUp)}
                                className="flex items-center gap-1 h-8 px-2 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" />
                                <span className="hidden sm:inline">Done</span>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Secondary Actions Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              {followUp.people && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenNotes(followUp.people!)}
                                  className="flex items-center gap-1 h-7 px-2 text-xs"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span className="hidden sm:inline">Notes</span>
                                </Button>
                              )}
                              {followUp.people && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenFrequency(followUp.people!)}
                                  className="flex items-center gap-1 h-7 px-2 text-xs"
                                >
                                  <Settings className="h-3 w-3" />
                                  <span className="hidden sm:inline">Freq</span>
                                </Button>
                              )}
                              {followUp.people && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenTag(followUp.people!)}
                                  className="flex items-center gap-1 h-7 px-2 text-xs"
                                  title={`Lead tag: ${followUp.people.lead_tag?.name || 'No tag'}`}
                                >
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{
                                      borderColor: followUp.people.lead_tag?.color || '#6b7280',
                                      color: followUp.people.lead_tag?.color || '#6b7280',
                                      backgroundColor: followUp.people.lead_tag?.color ? `${followUp.people.lead_tag.color}10` : 'transparent'
                                    }}
                                  >
                                    {followUp.people.lead_tag?.name || 'Tag'}
                                  </Badge>
                                </Button>
                              )}
                            </div>
                            {/* Delete button - only show for overdue follow-ups */}
                            {isOverdue(followUp) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDeleteFollowUp(followUp)}
                                className="flex items-center gap-1 h-7 px-2 text-xs"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            )}
                          </div>
                        </div>
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