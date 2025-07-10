'use client'

import { useState, useEffect } from 'react'
import { getFollowUps, updateFollowUp, createFollowUp, createActivity, createNote } from '@/lib/database'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'

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

function isOverdue(fu: any) {
  return fu.status !== 'completed' && new Date(fu.scheduled_date) < new Date()
}

export default function FollowUpsPage() {
  const { user } = useAuth()
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'upcoming' | 'overdue'>('upcoming')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeFollowUp, setActiveFollowUp] = useState<any>(null)
  const [interactionNote, setInteractionNote] = useState('')
  const [nextFollowUpDays, setNextFollowUpDays] = useState(7)
  const [saving, setSaving] = useState(false)
  // New state for scheduling follow-up
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [peopleOptions, setPeopleOptions] = useState<any[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [followUpType, setFollowUpType] = useState<'call' | 'email' | 'meeting' | 'task' | 'other'>('call')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)

  useEffect(() => {
    async function loadFollowUps() {
      try {
        setLoading(true)
        setError('')
        const data = await getFollowUps()
        setFollowUps(data)
      } catch (err: any) {
        setError('Failed to load follow-ups')
      } finally {
        setLoading(false)
      }
    }
    loadFollowUps()
  }, [])

  // Load people for the person selector
  useEffect(() => {
    async function loadPeople() {
      try {
        const data = await (await import('@/lib/database')).getPeople()
        setPeopleOptions(data)
      } catch {}
    }
    if (scheduleModalOpen) loadPeople()
  }, [scheduleModalOpen])

  const openInteractionModal = (fu: any) => {
    setActiveFollowUp(fu)
    setInteractionNote('')
    setNextFollowUpDays(7)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setActiveFollowUp(null)
    setInteractionNote('')
    setNextFollowUpDays(7)
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
      // 3. Schedule next follow-up
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + Number(nextFollowUpDays))
      await createFollowUp({
        person_id: activeFollowUp.people?.id,
        scheduled_date: nextDate.toISOString(),
        status: 'pending',
        type: activeFollowUp.type || 'call',
        notes: '',
        assigned_to: activeFollowUp.people?.assigned_to,
      })
      // 4. Refresh list
      const data = await getFollowUps()
      setFollowUps(data)
      closeModal()
    } catch (err) {
      setError('Failed to save interaction')
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
        assigned_to: peopleOptions.find(p => p.id === selectedPersonId)?.assigned_to,
      })
      const data = await getFollowUps()
      setFollowUps(data)
      closeScheduleModal()
    } catch {
      setError('Failed to schedule follow-up')
    } finally {
      setScheduleSaving(false)
    }
  }

  const filteredFollowUps = followUps.filter(fu =>
    filter === 'upcoming'
      ? fu.status !== 'completed' && new Date(fu.scheduled_date) >= new Date()
      : isOverdue(fu)
  )

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground text-lg mt-1">Manage your scheduled activities and reminders</p>
        </div>
        <Button className="flex items-center gap-2" variant="default" onClick={openScheduleModal}>
          <Plus className="h-4 w-4" />
          Schedule Follow-up
        </Button>
      </div>
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
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFollowUps.map((fu: any) => (
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
          )}
        </CardContent>
      </Card>
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
              <label className="block mb-1 font-medium">Next Follow-up</label>
              <Select value={String(nextFollowUpDays)} onValueChange={v => setNextFollowUpDays(Number(v))}>
                {NEXT_FOLLOWUP_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </Select>
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
                {peopleOptions.map((p: any) => (
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