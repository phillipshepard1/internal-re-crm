'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { LeadSource } from '@/lib/types/leadSources'

interface LeadSourceFormData {
  name: string
  description: string
  email_patterns: string[]
  domain_patterns: string[]
  keywords: string[]
  is_active: boolean
}

export default function LeadSourcesPage() {
  const { user, userRole } = useAuth()
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null)
  const [formData, setFormData] = useState<LeadSourceFormData>({
    name: '',
    description: '',
    email_patterns: [],
    domain_patterns: [],
    keywords: [],
    is_active: true
  })
  const [tempEmailPattern, setTempEmailPattern] = useState('')
  const [tempDomainPattern, setTempDomainPattern] = useState('')
  const [tempKeyword, setTempKeyword] = useState('')

  useEffect(() => {
    if (userRole === 'admin') {
      loadLeadSources()
    }
  }, [userRole])

  const loadLeadSources = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/lead-sources?includeDefaults=true')
      const data = await response.json()

      if (response.ok) {
        setLeadSources(data.lead_sources)
      } else {
        toast.error('Failed to load lead sources')
      }
    } catch (error) {
      console.error('Error loading lead sources:', error)
      toast.error('Failed to load lead sources')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    try {
      const url = editingSource ? '/api/admin/lead-sources' : '/api/admin/lead-sources'
      const method = editingSource ? 'PUT' : 'POST'
      const body = editingSource ? { ...formData, id: editingSource.id } : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(editingSource ? 'Lead source updated successfully' : 'Lead source created successfully')
        setShowForm(false)
        setEditingSource(null)
        resetForm()
        loadLeadSources()
      } else {
        toast.error(data.error || 'Failed to save lead source')
      }
    } catch (error) {
      console.error('Error saving lead source:', error)
      toast.error('Failed to save lead source')
    }
  }

  const handleEdit = (source: LeadSource) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      description: source.description || '',
      email_patterns: source.email_patterns,
      domain_patterns: source.domain_patterns,
      keywords: source.keywords,
      is_active: source.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (source: LeadSource) => {
    if (source.is_default) {
      toast.error('Cannot delete default lead sources')
      return
    }

    if (!confirm(`Are you sure you want to delete "${source.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/lead-sources?id=${source.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Lead source deleted successfully')
        loadLeadSources()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete lead source')
      }
    } catch (error) {
      console.error('Error deleting lead source:', error)
      toast.error('Failed to delete lead source')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      email_patterns: [],
      domain_patterns: [],
      keywords: [],
      is_active: true
    })
    setTempEmailPattern('')
    setTempDomainPattern('')
    setTempKeyword('')
  }

  const addEmailPattern = () => {
    if (tempEmailPattern.trim()) {
      setFormData(prev => ({
        ...prev,
        email_patterns: [...prev.email_patterns, tempEmailPattern.trim()]
      }))
      setTempEmailPattern('')
    }
  }

  const removeEmailPattern = (index: number) => {
    setFormData(prev => ({
      ...prev,
      email_patterns: prev.email_patterns.filter((_, i) => i !== index)
    }))
  }

  const addDomainPattern = () => {
    if (tempDomainPattern.trim()) {
      setFormData(prev => ({
        ...prev,
        domain_patterns: [...prev.domain_patterns, tempDomainPattern.trim()]
      }))
      setTempDomainPattern('')
    }
  }

  const removeDomainPattern = (index: number) => {
    setFormData(prev => ({
      ...prev,
      domain_patterns: prev.domain_patterns.filter((_, i) => i !== index)
    }))
  }

  const addKeyword = () => {
    if (tempKeyword.trim()) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, tempKeyword.trim()]
      }))
      setTempKeyword('')
    }
  }

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }))
  }

  if (userRole !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Sources</h1>
          <p className="text-muted-foreground">Manage lead sources for AI-powered email analysis</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead Source
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Source Configuration</CardTitle>
          <CardDescription>
            Configure email patterns, domains, and keywords to help the AI identify leads from different sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Email Patterns</TableHead>
                  <TableHead>Domain Patterns</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>{source.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {source.email_patterns.slice(0, 2).map((pattern, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {pattern}
                          </Badge>
                        ))}
                        {source.email_patterns.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{source.email_patterns.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {source.domain_patterns.slice(0, 2).map((pattern, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {pattern}
                          </Badge>
                        ))}
                        {source.domain_patterns.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{source.domain_patterns.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {source.keywords.slice(0, 2).map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {source.keywords.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{source.keywords.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_active ? "default" : "secondary"}>
                        {source.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_default ? "default" : "outline"}>
                        {source.is_default ? "Default" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(source)}
                          disabled={source.is_default}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(source)}
                          disabled={source.is_default}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lead Source Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Lead Source' : 'Add New Lead Source'}
            </DialogTitle>
            <DialogDescription>
              Configure patterns and keywords to help identify leads from this source.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Zillow, Website Form"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this lead source"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Email Patterns</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Email addresses that indicate this lead source (supports wildcards like *@zillow.com)
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tempEmailPattern}
                    onChange={(e) => setTempEmailPattern(e.target.value)}
                    placeholder="e.g., noreply@leadsource.com"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmailPattern())}
                  />
                  <Button type="button" onClick={addEmailPattern} disabled={!tempEmailPattern.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.email_patterns.map((pattern, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {pattern}
                      <button
                        type="button"
                        onClick={() => removeEmailPattern(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Domain Patterns</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Domain patterns to match (e.g., zillow.com, *.facebook.com)
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tempDomainPattern}
                    onChange={(e) => setTempDomainPattern(e.target.value)}
                    placeholder="e.g., zillow.com"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomainPattern())}
                  />
                  <Button type="button" onClick={addDomainPattern} disabled={!tempDomainPattern.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.domain_patterns.map((pattern, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {pattern}
                      <button
                        type="button"
                        onClick={() => removeDomainPattern(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Keywords</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Keywords in subject or body that indicate this lead source
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tempKeyword}
                    onChange={(e) => setTempKeyword(e.target.value)}
                    placeholder="e.g., property inquiry"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} disabled={!tempKeyword.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingSource ? 'Update' : 'Create'} Lead Source
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 