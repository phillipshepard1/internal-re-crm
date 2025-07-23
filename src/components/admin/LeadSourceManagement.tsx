'use client'

import { useState, useEffect } from 'react'
import { Plus, Mail, Globe, Tag, Edit, Trash2, Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertModal } from '@/components/ui/alert-modal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface LeadSource {
  id: string
  name: string
  description: string
  email_patterns: string[]
  domain_patterns: string[]
  keywords: string[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export function LeadSourceManagement() {
  const [leadSources, setLeadSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [addingEmail, setAddingEmail] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
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

  const loadLeadSources = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/admin/lead-sources?includeDefaults=true')
      if (!response.ok) {
        throw new Error('Failed to fetch lead sources')
      }
      
      const data = await response.json()
      setLeadSources(data.lead_sources || [])
    } catch (err) {
      setError('Failed to load lead sources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeadSources()
  }, [])

  const handleAddEmailAsLeadSource = async () => {
    if (!newEmail.trim()) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Please enter an email address',
        type: 'error'
      })
      return
    }

    try {
      setAddingEmail(true)
      
      const response = await fetch('/api/admin/lead-sources/add-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add email as lead source')
      }

      setAlertModal({
        open: true,
        title: 'Success',
        message: data.message || 'Email added as lead source successfully',
        type: 'success'
      })

      // Reset form and reload data
      setNewEmail('')
      setNewName('')
      setShowAddDialog(false)
      await loadLeadSources()

    } catch (err: any) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: err.message || 'Failed to add email as lead source',
        type: 'error'
      })
    } finally {
      setAddingEmail(false)
    }
  }

  const handleDeleteLeadSource = async (sourceId: string, sourceName: string) => {
    try {
      const response = await fetch(`/api/admin/lead-sources?id=${sourceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete lead source')
      }

      setAlertModal({
        open: true,
        title: 'Success',
        message: `Lead source "${sourceName}" deleted successfully`,
        type: 'success'
      })

      await loadLeadSources()

    } catch (err: any) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: err.message || 'Failed to delete lead source',
        type: 'error'
      })
    }
  }

  const handleTestEmailDetection = async () => {
    if (!testEmail.trim()) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Please enter an email address to test',
        type: 'error'
      })
      return
    }

    try {
      setTestingEmail(true)
      setTestResult(null)
      
      const response = await fetch('/api/admin/lead-sources/test-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test email detection')
      }

      setTestResult(data.message)

    } catch (err: any) {
      setTestResult(`Error: ${err.message}`)
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>
              Manage lead sources and add email addresses as lead sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading lead sources...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>
              Manage lead sources and add email addresses as lead sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription className="text-destructive">{error}</AlertDescription>
              <Button onClick={loadLeadSources} className="mt-4">
                Try Again
              </Button>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Test Email Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Email Detection</CardTitle>
          <CardDescription>
            Test if an email address would be detected as a lead source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleTestEmailDetection}
              disabled={testingEmail || !testEmail.trim()}
            >
              {testingEmail ? 'Testing...' : 'Test Detection'}
            </Button>
          </div>
          {testResult && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">{testResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>
                Manage lead sources and add email addresses as lead sources. When emails come from these addresses, they will be automatically categorized.
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Email as Lead Source
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Email as Lead Source</DialogTitle>
                  <DialogDescription>
                    Add an email address as a lead source. Future emails from this address will be automatically categorized.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@domain.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Display Name (Optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Company Name Email"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddEmailAsLeadSource}
                    disabled={addingEmail || !newEmail.trim()}
                  >
                    {addingEmail ? 'Adding...' : 'Add Lead Source'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {leadSources.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Email Patterns</TableHead>
                  <TableHead>Domain Patterns</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">
                      {source.name}
                    </TableCell>
                    <TableCell>
                      {source.description || '-'}
                    </TableCell>
                    <TableCell>
                      {source.email_patterns && source.email_patterns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {source.email_patterns.map((pattern, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Mail className="mr-1 h-3 w-3" />
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source.domain_patterns && source.domain_patterns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {source.domain_patterns.map((pattern, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Globe className="mr-1 h-3 w-3" />
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {source.keywords && source.keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {source.keywords.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="mr-1 h-3 w-3" />
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_default ? 'default' : 'secondary'}>
                        {source.is_default ? 'Default' : 'Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_active ? 'default' : 'destructive'}>
                        {source.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {!source.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLeadSource(source.id, source.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <AlertDescription>No lead sources found. Add your first email address as a lead source to get started.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
} 