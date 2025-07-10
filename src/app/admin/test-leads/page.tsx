'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function TestLeadsPage() {
  const router = useRouter()
  const { userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  
  const [leadData, setLeadData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    client_type: 'lead',
    lead_source: 'test'
  })

  // Redirect if not admin
  if (userRole !== 'admin') {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Alert>
          <AlertDescription className="text-destructive">
            Access denied. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key' // You can set this in your .env.local
        },
        body: JSON.stringify({
          ...leadData,
          email: leadData.email ? [leadData.email] : [],
          phone: leadData.phone ? [leadData.phone] : []
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        // Reset form
        setLeadData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company: '',
          position: '',
          client_type: 'lead',
          lead_source: 'test'
        })
      } else {
        setError(data.error || 'Failed to process lead')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Error testing lead:', err)
    } finally {
      setLoading(false)
    }
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
              <p>Go back to admin panel</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Test Lead Ingestion</h2>
            <p className="text-muted-foreground">
              Test the Round Robin lead assignment system
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Create Test Lead
              </CardTitle>
              <CardDescription>
                Fill out the form below to test lead ingestion and Round Robin assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={leadData.first_name}
                      onChange={(e) => setLeadData(prev => ({ ...prev, first_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={leadData.last_name}
                      onChange={(e) => setLeadData(prev => ({ ...prev, last_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={leadData.email}
                      onChange={(e) => setLeadData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={leadData.phone}
                      onChange={(e) => setLeadData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={leadData.company}
                      onChange={(e) => setLeadData(prev => ({ ...prev, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={leadData.position}
                      onChange={(e) => setLeadData(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" className="w-full" disabled={loading || !leadData.first_name || !leadData.last_name}>
                      {loading ? 'Processing...' : 'Create Test Lead'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Submit lead for Round Robin assignment</p>
                  </TooltipContent>
                </Tooltip>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Results
              </CardTitle>
              <CardDescription>
                View the results of lead processing and assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert>
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-green-600">
                      ✅ {result.message}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium">Assigned Leads:</h4>
                    {result.assignedLeads?.map((lead: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/50">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Assigned to: {lead.assigned_to}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Lead ID: {lead.id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!result && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No test results yet</p>
                  <p className="text-sm">Create a test lead to see the Round Robin assignment in action</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How Round Robin Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">1. Lead Ingestion</h4>
                <p className="text-sm text-muted-foreground">
                  External lead sources send lead data to the API endpoint
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2. Round Robin Assignment</h4>
                <p className="text-sm text-muted-foreground">
                  System automatically assigns leads to the next available agent in the queue
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">3. Lead Distribution</h4>
                <p className="text-sm text-muted-foreground">
                  Each agent gets leads in a fair, sequential order
                </p>
              </div>
            </div>
            
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Make sure you have configured Round Robin users in the Admin Panel before testing. 
                Only active users in the Round Robin queue will receive leads.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
} 