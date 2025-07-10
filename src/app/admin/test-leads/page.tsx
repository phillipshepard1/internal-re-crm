'use client'

import { useState, useEffect } from 'react'
import { Users, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { createTestLead, getRoundRobinConfig } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RoundRobinConfig } from '@/lib/supabase'
import Link from 'next/link'

interface TestLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  source: string
  assignedTo: string | null
  createdAt: string
  status: 'pending' | 'assigned' | 'contacted'
}

export default function TestLeadsPage() {
  const { userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [roundRobinConfig, setRoundRobinConfig] = useState<RoundRobinConfig[]>([])
  const [testLeads, setTestLeads] = useState<TestLead[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'test',
    notes: ''
  })

  useEffect(() => {
    loadRoundRobinConfig()
  }, [])

  const loadRoundRobinConfig = async () => {
    try {
      const config = await getRoundRobinConfig()
      setRoundRobinConfig(config)
    } catch (err) {
      console.error('Error loading Round Robin config:', err)
      setError('Failed to load Round Robin configuration')
    }
  }

  const createLead = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First name, last name, and email are required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await createTestLead({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        source: formData.source,
        notes: formData.notes
      })

      if (result.success) {
        setSuccess(`Test lead created successfully! Assigned to: ${result.assignedTo || 'No one (Round Robin not configured)'}`)
        
        // Add to test leads list
        const newLead: TestLead = {
          id: result.leadId || `test-${Date.now()}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          source: formData.source,
          assignedTo: result.assignedTo,
          createdAt: new Date().toISOString(),
          status: result.assignedTo ? 'assigned' : 'pending'
        }
        
        setTestLeads(prev => [newLead, ...prev])
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          source: 'test',
          notes: ''
        })

        // Auto-hide success message
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Failed to create test lead')
      }
    } catch (err: unknown) {
      console.error('Error creating test lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to create test lead')
    } finally {
      setLoading(false)
    }
  }

  const createMultipleLeads = async (count: number) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const promises = Array.from({ length: count }, (_, i) => 
        createTestLead({
          firstName: `Test${i + 1}`,
          lastName: 'User',
          email: `test${i + 1}@example.com`,
          phone: `555-${String(i + 1).padStart(3, '0')}`,
          source: 'bulk-test',
          notes: `Bulk test lead ${i + 1}`
        })
      )

      const results = await Promise.all(promises)
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        setSuccess(`Created ${successful.length} test leads successfully!${failed.length > 0 ? ` ${failed.length} failed.` : ''}`)
        
        // Add successful leads to list
        const newLeads: TestLead[] = successful.map((result, i) => ({
          id: result.leadId || `bulk-test-${Date.now()}-${i}`,
          firstName: `Test${i + 1}`,
          lastName: 'User',
          email: `test${i + 1}@example.com`,
          phone: `555-${String(i + 1).padStart(3, '0')}`,
          source: 'bulk-test',
          assignedTo: result.assignedTo,
          createdAt: new Date().toISOString(),
          status: result.assignedTo ? 'assigned' : 'pending'
        }))
        
        setTestLeads(prev => [...newLeads, ...prev])
      }

      if (failed.length > 0) {
        setError(`${failed.length} leads failed to create`)
      }

      setTimeout(() => setSuccess(''), 5000)
    } catch (err: unknown) {
      console.error('Error creating multiple leads:', err)
      setError(err instanceof Error ? err.message : 'Failed to create test leads')
    } finally {
      setLoading(false)
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert>
          <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Test Lead Creation</h2>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Round Robin Configuration</CardTitle>
            <CardDescription>
              Current Round Robin setup for lead distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roundRobinConfig.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Users ({roundRobinConfig.filter(c => c.is_active).length}):</p>
                <div className="space-y-1">
                  {roundRobinConfig
                    .filter(c => c.is_active)
                    .sort((a, b) => a.priority - b.priority)
                    .map((config) => (
                      <div key={config.user_id} className="flex items-center justify-between text-sm">
                        <span>User {config.user_id.slice(0, 8)}...</span>
                        <Badge variant="outline">Priority {config.priority}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No Round Robin configuration found. Leads will not be automatically assigned.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Create multiple test leads quickly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => createMultipleLeads(5)} 
                disabled={loading}
                variant="outline"
              >
                Create 5 Leads
              </Button>
              <Button 
                onClick={() => createMultipleLeads(10)} 
                disabled={loading}
                variant="outline"
              >
                Create 10 Leads
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => createMultipleLeads(25)} 
                disabled={loading}
                variant="outline"
              >
                Create 25 Leads
              </Button>
              <Button 
                onClick={() => createMultipleLeads(50)} 
                disabled={loading}
                variant="outline"
              >
                Create 50 Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Single Test Lead</CardTitle>
          <CardDescription>
            Create a single test lead to verify Round Robin assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createLead(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="555-123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test Lead</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this test lead..."
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || !formData.firstName || !formData.lastName || !formData.email}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Create Test Lead
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {testLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Leads</CardTitle>
            <CardDescription>
              Test leads created in this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.assignedTo ? (
                        <span className="text-sm">User {lead.assignedTo.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.status === 'assigned' ? 'default' : 'secondary'}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 