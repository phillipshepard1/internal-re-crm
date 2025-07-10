'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Phone, Mail, Calendar, MapPin, Building, User, Plus, Trash2 } from 'lucide-react'
import { getPersonById, updatePerson, deletePerson } from '@/lib/database'
import type { Person } from '@/lib/supabase'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
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
    try {
      setLoading(true)
      
      // Check if ID is a valid UUID
      if (!isValidUUID(id)) {
        setError('Invalid person ID')
        return
      }
      
      const data = await getPersonById(id, user?.id, userRole || undefined)
      if (data) {
        setPerson(data)
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || [''],
          phone: data.phone || [''],
          company: data.company || '',
          position: data.position || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          country: data.country || '',
          client_type: data.client_type || 'lead',
          notes: data.notes || '',
        })
      } else {
        setError('Person not found')
      }
    } catch (err) {
      setError('Failed to load person details')
      console.error('Error loading person:', err)
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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
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

        {/* Notes */}
        {person.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{person.notes}</p>
            </CardContent>
          </Card>
        )}

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
      </div>
    </TooltipProvider>
  )
} 