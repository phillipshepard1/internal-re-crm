'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, User, MapPin, Phone, MessageSquare, Upload } from 'lucide-react'
import { createPerson } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertModal } from '@/components/ui/alert-modal'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

export default function AddPersonPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<globalThis.File | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
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
    profile_picture: '',
    birthday: '',
    mailing_address: '',
    relationship_id: '',
    best_to_reach_by: '',
    notes: '',
    lists: [] as string[],
    // Properties
    looking_for: '',
    selling: '',
    closed: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const newPerson = await createPerson({
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
        profile_picture: formData.profile_picture,
        birthday: formData.birthday || null,
        mailing_address: formData.mailing_address,
        relationship_id: formData.relationship_id || null,
        best_to_reach_by: formData.best_to_reach_by,
        notes: formData.notes,
        lists: formData.lists,
        looking_for: formData.looking_for,
        selling: formData.selling,
        closed: formData.closed,
        assigned_to: user?.id || '',
      })
      
      router.push(`/people/${newPerson.id}`)
    } catch (err) {
      console.error('Error creating person:', err)
      setError('Failed to create person')
    } finally {
      setLoading(false)
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

  const toggleList = (listValue: string) => {
    setFormData(prev => ({
      ...prev,
      lists: prev.lists.includes(listValue)
        ? prev.lists.filter(l => l !== listValue)
        : [...prev.lists, listValue]
    }))
  }

  const handleProfilePictureUpload = async () => {
    if (!selectedProfilePicture) return

    try {
      setUploadingPicture(true)
      
      // Create a temporary person ID for upload
      const tempPersonId = 'temp-' + Date.now()
      
      const formData = new FormData()
      formData.append('file', selectedProfilePicture)
      formData.append('personId', tempPersonId)
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
      setUploadingPicture(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Add New Person</h2>
            <p className="text-muted-foreground">
              Create a new contact in your CRM
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => router.push('/people')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to People
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Return to people list</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList>
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="contact">Contact Details</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
        <Card>
          <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Basic Information
                  </CardTitle>
            <CardDescription>
                    Essential information about the contact
            </CardDescription>
          </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First Name <span className="text-red-500">*</span>
                      </label>
                  <Input
                    id="firstName"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                  <Input
                    id="lastName"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Profile Picture</label>
                    
                    {/* Current Profile Picture Display */}
                    {formData.profile_picture && (
                      <div className="flex items-center space-x-4 mb-4">
                        <img
                          src={formData.profile_picture}
                          alt="Profile picture preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="text-sm text-muted-foreground">
                          Profile picture preview
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedProfilePicture(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      {selectedProfilePicture && (
                        <div className="flex items-center space-x-2">
                          <Button 
                            type="button" 
                            size="sm" 
                            onClick={handleProfilePictureUpload}
                            disabled={uploadingPicture}
                          >
                            {uploadingPicture ? 'Uploading...' : 'Upload Profile Picture'}
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {selectedProfilePicture.name}
                          </span>
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

                  <div className="grid gap-2">
                    <label htmlFor="clientType" className="text-sm font-medium">Client Type</label>
                    <Select
                      value={formData.client_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, client_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client type" />
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
                    <label htmlFor="birthday" className="text-sm font-medium">Birthday</label>
                  <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Add To Lists</label>
                    <div className="flex flex-wrap gap-2">
                      {listOptions.map((list) => (
                        <Badge
                          key={list.value}
                          variant={formData.lists.includes(list.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleList(list.value)}
                        >
                          {list.label}
                        </Badge>
                      ))}
                </div>
              </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="mr-2 h-5 w-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Email addresses and phone numbers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Email Addresses</label>
                {formData.email.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="Enter email address"
                          type="email"
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
                          type="tel"
                        />
                  </div>
                ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phone
                </Button>
              </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Address Information
                  </CardTitle>
                  <CardDescription>
                    Physical and mailing addresses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
              <div className="grid gap-2">
                    <label htmlFor="address" className="text-sm font-medium">Street Address</label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter street address"
                />
              </div>

                  <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="city" className="text-sm font-medium">City</label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Enter city"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="state" className="text-sm font-medium">State</label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="zipCode" className="text-sm font-medium">ZIP Code</label>
                  <Input
                    id="zipCode"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="Enter ZIP code"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="country" className="text-sm font-medium">Country</label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Enter country"
                />
              </div>

              <div className="grid gap-2">
                    <label htmlFor="mailingAddress" className="text-sm font-medium">Mailing Address</label>
                    <Textarea
                      id="mailingAddress"
                      value={formData.mailing_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, mailing_address: e.target.value }))}
                      placeholder="Enter mailing address (if different from street address)"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Professional Information
                  </CardTitle>
                  <CardDescription>
                    Company and position details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="company" className="text-sm font-medium">Company</label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="position" className="text-sm font-medium">Position</label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="Enter job title"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="properties" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Properties
                  </CardTitle>
                  <CardDescription>
                    Property information for real estate contacts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Communication Preferences
                  </CardTitle>
                  <CardDescription>
                    How and when to contact this person
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="relationship" className="text-sm font-medium">Relationship</label>
                    <Input
                      id="relationship"
                      value={formData.relationship_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, relationship_id: e.target.value }))}
                      placeholder="Enter relationship or link to another contact"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="bestToReachBy" className="text-sm font-medium">Best To Reach By</label>
                <Select
                      value={formData.best_to_reach_by}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, best_to_reach_by: value }))}
                >
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

              <div className="grid gap-2">
                    <label htmlFor="notes" className="text-sm font-medium">General Notes</label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter any additional notes or preferences"
                  rows={4}
                />
              </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/people')}
                  disabled={loading}
                >
                  Cancel
                </Button>
            <Button type="submit" disabled={loading || !formData.first_name.trim()}>
                  {loading ? 'Creating...' : 'Create Person'}
                </Button>
              </div>
            </form>
      </div>
      
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </TooltipProvider>
  )
} 