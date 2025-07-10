'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, User, Edit, Trash2 } from 'lucide-react'
import { getFollowUps, createFollowUp, updateFollowUp, deleteFollowUp } from '@/lib/database'
import type { FollowUp } from '@/lib/supabase'
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

const typeOptions = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'other', label: 'Other' },
]

export default function FollowUpsPage() {
  const { user, userRole } = useAuth()
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null)
  const [followUpTitle, setFollowUpTitle] = useState('')
  const [followUpDescription, setFollowUpDescription] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpType, setFollowUpType] = useState('call')
  const [saving, setSaving] = useState(false)

  const loadFollowUps = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getFollowUps(user?.id, userRole || undefined)
      setFollowUps(data)
    } catch (err) {
      setError('Failed to load follow-ups')
      console.error('Error loading follow-ups:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, userRole])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  const handleCreateFollowUp = () => {
    setEditingFollowUp(null)
    setFollowUpTitle('')
    setFollowUpDescription('')
    setFollowUpDate('')
    setFollowUpType('call')
    setShowCreateModal(true)
  }

  const handleEditFollowUp = (followUp: FollowUp) => {
    setEditingFollowUp(followUp)
    setFollowUpTitle(followUp.notes || '')
    setFollowUpDescription(followUp.notes || '')
    setFollowUpDate(followUp.scheduled_date || '')
    setFollowUpType(followUp.type || 'call')
    setShowCreateModal(true)
  }

  const handleSaveFollowUp = async () => {
    if (!followUpTitle.trim() || !followUpDate) return

    try {
      setSaving(true)
      
      if (editingFollowUp) {
        const updatedFollowUp = await updateFollowUp(editingFollowUp.id, {
          notes: followUpTitle,
          scheduled_date: followUpDate,
          type: followUpType as 'call' | 'email' | 'meeting' | 'task' | 'other',
        })
        setFollowUps(followUps.map(followUp => 
          followUp.id === editingFollowUp.id ? updatedFollowUp : followUp
        ))
      } else {
        const newFollowUp = await createFollowUp({
          notes: followUpTitle,
          person_id: null,
          assigned_to: user?.id || '',
          scheduled_date: followUpDate,
          type: followUpType as 'call' | 'email' | 'meeting' | 'task' | 'other',
        })
        setFollowUps([newFollowUp, ...followUps])
      }
      
      setShowCreateModal(false)
      setEditingFollowUp(null)
      setFollowUpTitle('')
      setFollowUpDescription('')
      setFollowUpDate('')
      setFollowUpType('call')
    } catch (err) {
      console.error('Error saving follow-up:', err)
      alert('Failed to save follow-up')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return

    try {
      await deleteFollowUp(followUpId)
      setFollowUps(followUps.filter(followUp => followUp.id !== followUpId))
    } catch (err) {
      console.error('Error deleting follow-up:', err)
      alert('Failed to delete follow-up')
    }
  }

  const getStatusBadge = (scheduledDate: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledDate)
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

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Follow-ups</h2>
            <p className="text-muted-foreground">
              Manage your scheduled activities and reminders
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
              Manage your scheduled activities and reminders
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          <Button onClick={loadFollowUps} className="mt-4">
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
              Manage your scheduled activities and reminders
            </p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCreateFollowUp}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Follow-up
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Schedule a new follow-up activity</p>
                </TooltipContent>
              </Tooltip>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingFollowUp ? 'Edit Follow-up' : 'Schedule New Follow-up'}</DialogTitle>
                <DialogDescription>
                  {editingFollowUp ? 'Make changes to your follow-up here.' : 'Schedule a new follow-up activity.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">Notes</label>
                  <Input
                    id="title"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    placeholder="Enter follow-up notes"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">Additional Details</label>
                  <Textarea
                    id="description"
                    value={followUpDescription}
                    onChange={(e) => setFollowUpDescription(e.target.value)}
                    placeholder="Enter additional details (optional)"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="date" className="text-sm font-medium">Scheduled Date</label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type" className="text-sm font-medium">Type</label>
                  <Select value={followUpType} onValueChange={setFollowUpType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFollowUp} disabled={!followUpTitle.trim() || !followUpDate || saving}>
                  {saving ? 'Saving...' : (editingFollowUp ? 'Update' : 'Schedule')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Follow-ups</CardTitle>
            <CardDescription>
              View and manage all your scheduled activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followUps.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notes</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUps.map((followUp) => (
                    <TableRow key={followUp.id}>
                      <TableCell className="font-medium">{followUp.notes}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {followUp.type || 'Call'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {followUp.scheduled_date ? (
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            {new Date(followUp.scheduled_date).toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {followUp.scheduled_date && getStatusBadge(followUp.scheduled_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          {followUp.assigned_to || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditFollowUp(followUp)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit follow-up</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFollowUp(followUp.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete follow-up</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert>
                <AlertDescription>No follow-ups found. Schedule your first follow-up to get started.</AlertDescription>
                <Button onClick={handleCreateFollowUp} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Your First Follow-up
                </Button>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
} 