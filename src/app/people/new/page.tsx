'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { createPerson } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'

const clientTypeOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'client', label: 'Client' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
]

export default function AddPersonPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
        notes: formData.notes,
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

  const removeEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      email: prev.email.filter((_, i) => i !== index)
    }))
  }

  const removePhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phone: prev.phone.filter((_, i) => i !== index)
    }))
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
            <h2 className="text-3xl font-bold tracking-tight">Add New Person</h2>
            <p className="text-muted-foreground">
              Create a new contact in your CRM
            </p>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Enter the contact details for the new person.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="firstName" className="text-sm font-medium">First Name *</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid gap-2">
                <label className="text-sm font-medium">Email Addresses</label>
                {formData.email.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="Enter email address"
                    />
                    {formData.email.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmail(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmail}
                  className="w-fit"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Email
                </Button>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Phone Numbers</label>
                {formData.phone.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      placeholder="Enter phone number"
                    />
                    {formData.phone.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePhone(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPhone}
                  className="w-fit"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phone
                </Button>
              </div>

              <div className="grid gap-2">
                <label htmlFor="address" className="text-sm font-medium">Address</label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/people')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Person'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
} 