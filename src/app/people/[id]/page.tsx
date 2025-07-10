'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Phone, Mail, Calendar, MapPin, Building, User, Plus, Trash2, FileText, CheckSquare, Activity, Upload } from 'lucide-react'
import { getPersonById, updatePerson, deletePerson, getNotes, createNote, getTasks, createTask } from '@/lib/database'
import type { Person, Note, Task } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const clientTypeOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'client', label: 'Client' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
]

export default function PersonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userRole } = useAuth()
  const [person, setPerson] = useState<Person | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: [''],
    phone: [''],
    company: '',
    position: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    client_type: 'lead',
    notes: '',
  })

  useEffect(() => {
    if (params.id) {
      loadPerson(params.id as string)
    }
  }, [params.id])

  // UUID validation function
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  const loadPerson = async (id: string) => {
    if (!isValidUUID(id)) {
      setError('Invalid person ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const personData = await getPersonById(id, user?.id, userRole || undefined)
      setPerson(personData)
      
      // Load notes and tasks for this person
      try {
        const notesData = await getNotes(id)
        setNotes(notesData)
      } catch (err) {
        console.error('Error loading notes:', err)
      }

      try {
        const tasksData = await getTasks(id, user?.id, userRole || undefined)
        setTasks(tasksData)
      } catch (err) {
        console.error('Error loading tasks:', err)
      }

      // Initialize form data
      setFormData({
        first_name: personData.first_name || '',
        last_name: personData.last_name || '',
        email: personData.email || [''],
        phone: personData.phone || [''],
        company: personData.company || '',
        position: personData.position || '',
        address: personData.address || '',
        city: personData.city || '',
        state: personData.state || '',
        zip_code: personData.zip_code || '',
        country: personData.country || '',
        client_type: personData.client_type || 'lead',
        notes: personData.notes || '',
      })
    } catch (err) {
      console.error('Error loading person:', err)
      setError('Failed to load person')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!person || !formData.first_name.trim()) return

    try {
      setSaving(true)
      const updatedPerson = await updatePerson(person.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email.filter(e => e.trim()),
        phone: formData.phone.filter(p => p.trim()),
        company: formData.company,
        position: formData.position,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        client_type: formData.client_type as 'lead' | 'prospect' | 'client' | 'partner' | 'vendor',
        notes: formData.notes,
      })
      setPerson(updatedPerson)
      setShowEditModal(false)
    } catch (err) {
      console.error('Error updating person:', err)
      alert('Failed to update person')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!person || !confirm('Are you sure you want to delete this person?')) return

    try {
      await deletePerson(person.id)
      router.push('/people')
    } catch (err) {
      console.error('Error deleting person:', err)
      alert('Failed to delete person')
    }
  }

  const handleSaveNote = async () => {
    if (!person || !noteTitle.trim()) return

    try {
      setSaving(true)
      const newNote = await createNote({
        title: noteTitle,
        content: noteContent,
        person_id: person.id,
        created_by: user?.id || '',
      })
      setNotes([newNote, ...notes])
      setShowNoteModal(false)
      setNoteTitle('')
      setNoteContent('')
    } catch (err) {
      console.error('Error creating note:', err)
      alert('Failed to create note')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTask = async () => {
    if (!person || !taskTitle.trim()) return

    try {
      setSaving(true)
      const newTask = await createTask({
        title: taskTitle,
        description: taskDescription,
        person_id: person.id,
        assigned_to: user?.id || '',
        due_date: taskDueDate,
        status: 'pending',
      })
      setTasks([newTask, ...tasks])
      setShowTaskModal(false)
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      email: [...prev.email, '']
    }))
  }

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phone: [...prev.phone, '']
    }))
  }

  const updateEmail = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      email: prev.email.map((email, i) => i === index ? value : email)
    }))
  }

  const updatePhone = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      phone: prev.phone.map((phone, i) => i === index ? value : phone)
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading person details...</p>
        </div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert>
          <AlertDescription className="text-destructive">
            {error || 'Person not found'}
          </AlertDescription>
          <Button onClick={() => router.push('/people')} className="mt-4">
            Back to People
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go back to people list</p>
              </TooltipContent>
            </Tooltip>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {person.first_name} {person.last_name}
              </h2>
              <p className="text-muted-foreground">
                Contact details and information
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit contact information</p>
                  </TooltipContent>
                </Tooltip>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Contact</DialogTitle>
                  <DialogDescription>
                    Make changes to the contact information here.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                      <Input
                        id="firstName"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                      <Input
                        id="lastName"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Email Addresses</label>
                    {formData.email.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Email
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Phone Numbers</label>
                    {formData.phone.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={phone}
                          onChange={(e) => updatePhone(index, e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Phone
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="company" className="text-sm font-medium">Company</label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="position" className="text-sm font-medium">Position</label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="address" className="text-sm font-medium">Address</label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="city" className="text-sm font-medium">City</label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="state" className="text-sm font-medium">State</label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="zipCode" className="text-sm font-medium">ZIP Code</label>
                      <Input
                        id="zipCode"
                        value={formData.zip_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="country" className="text-sm font-medium">Country</label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="clientType" className="text-sm font-medium">Client Type</label>
                    <Select value={formData.client_type} onValueChange={(value) => setFormData(prev => ({ ...prev, client_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {clientTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.first_name.trim() || saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete this contact permanently</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {person.client_type || 'Contact'}
                    </Badge>
                    {person.company && (
                      <Badge variant="secondary">
                        <Building className="mr-1 h-3 w-3" />
                        {person.company}
                      </Badge>
                    )}
                  </div>
                  
                  {person.email && person.email.length > 0 && person.email[0] && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{person.email[0]}</span>
                    </div>
                  )}
                  
                  {person.phone && person.phone.length > 0 && person.phone[0] && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{person.phone[0]}</span>
                    </div>
                  )}
                  
                  {person.position && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{person.position}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {person.address && (
                    <p>{person.address}</p>
                  )}
                  {(person.city || person.state || person.zip_code) && (
                    <p>
                      {[person.city, person.state, person.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {person.country && (
                    <p>{person.country}</p>
                  )}
                  {!person.address && !person.city && !person.state && !person.zip_code && !person.country && (
                    <p className="text-muted-foreground">No address information available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Activity Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Last Interaction</p>
                    <p className="text-sm text-muted-foreground">
                      {person.last_interaction 
                        ? new Date(person.last_interaction).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Next Follow-up</p>
                    <p className="text-sm text-muted-foreground">
                      {person.next_follow_up 
                        ? new Date(person.next_follow_up).toLocaleDateString()
                        : 'Not scheduled'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Notes */}
            {person.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>General Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{person.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Automatically generated log of activities for this contact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Contact created</p>
                      <p className="text-xs text-muted-foreground">
                        Created by {user?.email} on {new Date(person.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {person.last_interaction && (
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Last interaction logged</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(person.last_interaction).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {notes.length > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notes.length} note{notes.length !== 1 ? 's' : ''} added</p>
                        <p className="text-xs text-muted-foreground">
                          Latest: {new Date(notes[0]?.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {tasks.length > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tasks.length} task{tasks.length !== 1 ? 's' : ''} created</p>
                        <p className="text-xs text-muted-foreground">
                          Latest: {new Date(tasks[0]?.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Notes
                    </CardTitle>
                    <CardDescription>
                      Notes specific to this contact
                    </CardDescription>
                  </div>
                  <Dialog open={showNoteModal} onOpenChange={setShowNoteModal}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Note</DialogTitle>
                        <DialogDescription>
                          Add a new note for this contact.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label htmlFor="noteTitle" className="text-sm font-medium">Title</label>
                          <Input
                            id="noteTitle"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            placeholder="Enter note title"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="noteContent" className="text-sm font-medium">Content</label>
                          <Textarea
                            id="noteContent"
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Enter note content"
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowNoteModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveNote} disabled={!noteTitle.trim() || saving}>
                          {saving ? 'Saving...' : 'Save Note'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{note.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No notes yet</h3>
                    <p className="text-muted-foreground">
                      Add your first note to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <CheckSquare className="mr-2 h-5 w-5" />
                      Tasks
                    </CardTitle>
                    <CardDescription>
                      Tasks specific to this contact
                    </CardDescription>
                  </div>
                  <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Task</DialogTitle>
                        <DialogDescription>
                          Add a new task for this contact.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label htmlFor="taskTitle" className="text-sm font-medium">Title</label>
                          <Input
                            id="taskTitle"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="taskDescription" className="text-sm font-medium">Description</label>
                          <Textarea
                            id="taskDescription"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="taskDueDate" className="text-sm font-medium">Due Date</label>
                          <Input
                            id="taskDueDate"
                            type="date"
                            value={taskDueDate}
                            onChange={(e) => setTaskDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveTask} disabled={!taskTitle.trim() || saving}>
                          {saving ? 'Saving...' : 'Save Task'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>{task.description || '-'}</TableCell>
                          <TableCell>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              task.status === 'completed' ? 'default' :
                              task.status === 'in_progress' ? 'secondary' : 'outline'
                            }>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No tasks yet</h3>
                    <p className="text-muted-foreground">
                      Add your first task to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Upload className="mr-2 h-5 w-5" />
                      Files
                    </CardTitle>
                    <CardDescription>
                      Files related to this contact
                    </CardDescription>
                  </div>
                  <Button disabled>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">File upload coming soon</h3>
                  <p className="text-muted-foreground">
                    File upload functionality will be implemented in a future update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
} 