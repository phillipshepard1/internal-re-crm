'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Phone, Mail, Calendar, MapPin, Building, User, Plus, Trash2, FileText, CheckSquare, Activity, Upload, MessageSquare } from 'lucide-react'
import { getPersonById, updatePerson, deletePerson, getNotes, createNote, getTasks, createTask, getActivities, getFiles } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import type { Person, Note, Task, Activity as ActivityType, File } from '@/lib/supabase'
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
import { AlertModal } from '@/components/ui/alert-modal'

const clientTypeOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'client', label: 'Client' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
]

const bestToReachOptions = [
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'mail', label: 'Mail' },
]

const listOptions = [
  { value: 'vip_clients', label: 'VIP Clients' },
  { value: 'hot_leads', label: 'Hot Leads' },
  { value: 'cold_leads', label: 'Cold Leads' },
  { value: 'past_clients', label: 'Past Clients' },
]

export default function PersonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userRole } = useAuth()
  const [person, setPerson] = useState<Person | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null)
  const [fileDescription, setFileDescription] = useState('')
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<globalThis.File | null>(null)
  const [alertModal, setAlertModal] = useState<{
    open: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onConfirm?: () => void
    showCancel?: boolean
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  })
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
    // Missing fields
    profile_picture: '',
    birthday: '',
    mailing_address: '',
    relationship_id: '',
    best_to_reach_by: '',
    lists: [] as string[],
    looking_for: '',
    selling: '',
    closed: '',
  })

  const loadPerson = useCallback(async () => {
    if (!params.id) return

    try {
      setLoading(true)
      const personId = params.id as string
      const [personData, notesData, tasksData, activitiesData, filesData] = await Promise.all([
        getPersonById(personId, user?.id, userRole || undefined),
        getNotes(personId),
        getTasks(personId, user?.id, userRole || undefined),
        getActivities(personId),
        getFiles(personId),
      ])
      
      setPerson(personData)
      setNotes(notesData)
      setTasks(tasksData)
      setActivities(activitiesData)
      setUploadedFiles(filesData)
      // setFollowUps(followUpsData.filter(f => f.person_id === personId)) // This line was removed from original, so it's removed here.
      // setActivities(activitiesData) // This line was removed from original, so it's removed here.

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
        profile_picture: personData.profile_picture || '',
        birthday: personData.birthday || '',
        mailing_address: personData.mailing_address || '',
        relationship_id: personData.relationship_id || '',
        best_to_reach_by: personData.best_to_reach_by || '',
        lists: personData.lists || [],
        looking_for: personData.looking_for || '',
        selling: personData.selling || '',
        closed: personData.closed || '',
      })
    } catch (err) {
      console.error('Error loading person:', err)
      setError('Failed to load person')
    } finally {
      setLoading(false)
    }
  }, [params.id, user?.id, userRole])

  useEffect(() => {
    loadPerson()
  }, [loadPerson])

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
        profile_picture: formData.profile_picture,
        birthday: formData.birthday || null,
        mailing_address: formData.mailing_address,
        relationship_id: formData.relationship_id || null,
        best_to_reach_by: formData.best_to_reach_by,
        lists: formData.lists,
        looking_for: formData.looking_for,
        selling: formData.selling,
        closed: formData.closed,
      })
      setPerson(updatedPerson)
      setShowEditModal(false)
    } catch (err) {
      console.error('Error updating person:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to update person',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!person) return

    setAlertModal({
      open: true,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this person? This action cannot be undone and will also delete all related notes, tasks, follow-ups, and files.',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deletePerson(person.id)
          router.push('/people')
        } catch (err: any) {
          console.error('Error deleting person:', err)
          
          // Check if it's a foreign key constraint error
          if (err.code === '23503') {
            setAlertModal({
              open: true,
              title: 'Cannot Delete',
              message: 'Cannot delete this person because they have related records (notes, tasks, follow-ups, or files). Please delete all related records first, or contact an administrator.',
              type: 'error'
            })
          } else {
            setAlertModal({
              open: true,
              title: 'Error',
              message: 'Failed to delete person: ' + (err.message || 'Unknown error'),
              type: 'error'
            })
          }
        }
      }
    })
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
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to create note',
        type: 'error'
      })
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
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to create task',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async () => {
    if (!person || !selectedFile) return

    try {
      setSaving(true)
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('personId', person.id)
      formData.append('description', fileDescription)
      formData.append('userId', user?.id || '')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const result = await response.json()
      
      if (result.success) {
        setUploadedFiles([result.file, ...uploadedFiles])
        setShowFileModal(false)
        setSelectedFile(null)
        setFileDescription('')
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to upload file',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }



  const handleProfilePictureUpload = async () => {
    if (!person || !selectedProfilePicture) return

    try {
      setSaving(true)
      

      
      const formData = new FormData()
      formData.append('file', selectedProfilePicture)
      formData.append('personId', person.id)
      formData.append('description', 'Profile Picture')
      formData.append('userId', user?.id || '')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload profile picture')
      }

      const result = await response.json()
      

      
      if (result.success) {
        // Update the person's profile picture URL
        const updatedPerson = await updatePerson(person.id, {
          profile_picture: result.publicUrl
        })
        setPerson(updatedPerson)
        setFormData(prev => ({ ...prev, profile_picture: result.publicUrl }))
        setSelectedProfilePicture(null)
        setAlertModal({
          open: true,
          title: 'Success',
          message: 'Profile picture uploaded successfully!',
          type: 'success'
        })
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to upload profile picture',
        type: 'error'
      })
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
              <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    {person.profile_picture ? (
                      <img
                        src={person.profile_picture}
                        alt={`${person.first_name} ${person.last_name}`}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    
                    {/* Quick Upload Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setSelectedProfilePicture(file)
                              // We'll handle the upload in the edit modal for better UX
                              setShowEditModal(true)
                            }
                          }}
                        />
                        <Upload className="w-6 h-6 text-white" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                      {person.first_name} {person.last_name}
                    </h2>
                    <p className="text-muted-foreground">
                      Contact details and information
                    </p>
                  </div>
                </div>
              </div>
          <div className="flex items-center space-x-2">
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setShowEditModal(true)}>
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

                  {/* Profile Picture */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Profile Picture</label>
                    
                    {/* Current Profile Picture Display */}
                    {formData.profile_picture && (
                      <div className="flex items-center space-x-4 mb-4">
                        <img
                          src={formData.profile_picture}
                          alt="Current profile picture"
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="text-sm text-muted-foreground">
                          Current profile picture
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          setSelectedProfilePicture(e.target.files?.[0] || null)
                        }}
                        className="cursor-pointer"
                      />
                      {selectedProfilePicture ? (
                        <div className="flex items-center space-x-2">
                          <Button 
                            type="button" 
                            size="sm" 
                            onClick={handleProfilePictureUpload}
                            disabled={saving}
                          >
                            {saving ? 'Uploading...' : 'Upload Profile Picture'}
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {selectedProfilePicture.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No file selected
                        </div>
                      )}
                    </div>
                    
                    {/* URL Input (fallback) */}
                    <div className="mt-2">
                      <label htmlFor="profilePictureUrl" className="text-sm font-medium text-muted-foreground">
                        Or enter URL manually:
                      </label>
                      <Input
                        id="profilePictureUrl"
                        value={formData.profile_picture}
                        onChange={(e) => setFormData(prev => ({ ...prev, profile_picture: e.target.value }))}
                        placeholder="Enter profile picture URL"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Birthday */}
                  <div className="grid gap-2">
                    <label htmlFor="birthday" className="text-sm font-medium">Birthday</label>
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                    />
                  </div>

                  {/* Mailing Address */}
                  <div className="grid gap-2">
                    <label htmlFor="mailingAddress" className="text-sm font-medium">Mailing Address</label>
                    <Textarea
                      id="mailingAddress"
                      value={formData.mailing_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, mailing_address: e.target.value }))}
                      placeholder="Enter mailing address"
                      rows={3}
                    />
                  </div>

                  {/* Best to Reach By */}
                  <div className="grid gap-2">
                    <label htmlFor="bestToReachBy" className="text-sm font-medium">Best to Reach By</label>
                    <Select value={formData.best_to_reach_by} onValueChange={(value) => setFormData(prev => ({ ...prev, best_to_reach_by: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preferred contact method" />
                      </SelectTrigger>
                      <SelectContent>
                        {bestToReachOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Relationship */}
                  <div className="grid gap-2">
                    <label htmlFor="relationship" className="text-sm font-medium">Relationship</label>
                    <Input
                      id="relationship"
                      value={formData.relationship_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, relationship_id: e.target.value }))}
                      placeholder="Enter relationship or link to another contact"
                    />
                  </div>

                  {/* Lists */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Lists</label>
                    <div className="grid grid-cols-2 gap-2">
                      {listOptions.map((option) => (
                        <label key={option.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.lists.includes(option.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, lists: [...prev.lists, option.value] }))
                              } else {
                                setFormData(prev => ({ ...prev, lists: prev.lists.filter(list => list !== option.value) }))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Properties Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Properties</h4>
                    
                    <div className="grid gap-2">
                      <label htmlFor="lookingFor" className="text-sm font-medium">Looking For</label>
                      <Textarea
                        id="lookingFor"
                        value={formData.looking_for}
                        onChange={(e) => setFormData(prev => ({ ...prev, looking_for: e.target.value }))}
                        placeholder="Describe what properties they're looking for"
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="selling" className="text-sm font-medium">Selling</label>
                      <Textarea
                        id="selling"
                        value={formData.selling}
                        onChange={(e) => setFormData(prev => ({ ...prev, selling: e.target.value }))}
                        placeholder="Describe properties they're selling"
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="closed" className="text-sm font-medium">Closed</label>
                      <Textarea
                        id="closed"
                        value={formData.closed}
                        onChange={(e) => setFormData(prev => ({ ...prev, closed: e.target.value }))}
                        placeholder="Describe closed transactions"
                        rows={3}
                      />
                    </div>
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
            <TabsTrigger value="files">Files ({uploadedFiles.length})</TabsTrigger>
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

                  {person.birthday && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Birthday: {new Date(person.birthday).toLocaleDateString()}</span>
                    </div>
                  )}

                  {person.best_to_reach_by && (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>Best to reach by: {person.best_to_reach_by}</span>
                    </div>
                  )}

                  {person.lists && person.lists.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Lists:</span>
                      <div className="flex flex-wrap gap-1">
                        {person.lists.map((list, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {listOptions.find(option => option.value === list)?.label || list}
                          </Badge>
                        ))}
                      </div>
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

            {/* Properties Information */}
            {(person.looking_for || person.selling || person.closed) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {person.looking_for && (
                    <div>
                      <h4 className="text-sm font-medium text-green-600">Looking For</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.looking_for}</p>
                    </div>
                  )}
                  
                  {person.selling && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-600">Selling</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.selling}</p>
                    </div>
                  )}
                  
                  {person.closed && (
                    <div>
                      <h4 className="text-sm font-medium text-purple-600">Closed</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.closed}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                  {/* Contact creation activity */}
                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Contact created</p>
                      <p className="text-xs text-muted-foreground">
                        Created on {new Date(person.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Real activities from database */}
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'created' ? 'bg-primary' :
                        activity.type === 'follow_up' ? 'bg-green-500' :
                        activity.type === 'note_added' ? 'bg-blue-500' :
                        activity.type === 'task_added' ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Last interaction if no activities */}
                  {activities.length === 0 && person.last_interaction && (
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
                  
                  {/* Summary stats */}
                  {(notes.length > 0 || tasks.length > 0) && (
                    <div className="mt-6 p-4 border rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {notes.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Notes:</span> {notes.length}
                          </div>
                        )}
                        {tasks.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Tasks:</span> {tasks.length}
                          </div>
                        )}
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
                  <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload File</DialogTitle>
                        <DialogDescription>
                          Upload a file related to this contact.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label htmlFor="file" className="text-sm font-medium">File</label>
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="fileDescription" className="text-sm font-medium">Description</label>
                          <Textarea
                            id="fileDescription"
                            value={fileDescription}
                            onChange={(e) => setFileDescription(e.target.value)}
                            placeholder="Enter file description"
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowFileModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleFileUpload} disabled={!selectedFile || saving}>
                          {saving ? 'Uploading...' : 'Upload File'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium">{file.filename}</h4>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            <p>Size: {file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : 'Unknown'}</p>
                            <p>Type: {file.mime_type || 'Unknown'}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Get the public URL from Supabase
                              const { data } = supabase.storage
                                .from('internal-re-crm-files')
                                .getPublicUrl(file.file_path)
                              window.open(data.publicUrl, '_blank')
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No files uploaded yet</h3>
                    <p className="text-muted-foreground">
                      Upload your first file to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={alertModal.onConfirm}
        showCancel={alertModal.showCancel}
      />
    </TooltipProvider>
  )
} 