'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestLeadPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  
  const [leadData, setLeadData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company: 'Acme Corp',
    source: 'website',
    notes: 'Interested in our services'
  })

  const testLeadIngestion = async () => {
    try {
      setLoading(true)
      setError('')
      setResult(null)

      const response = await fetch('/api/leads/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key-123' // Using the test API key
        },
        body: JSON.stringify(leadData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ingest lead')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateLeadData = (field: string, value: string) => {
    setLeadData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Lead Ingestion</h1>
        <p className="text-muted-foreground">
          Test the Round Robin lead assignment system via API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Data</CardTitle>
          <CardDescription>
            Fill in the lead information to test ingestion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={leadData.name}
                onChange={(e) => updateLeadData('name', e.target.value)}
                placeholder="Lead name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={leadData.email}
                onChange={(e) => updateLeadData('email', e.target.value)}
                placeholder="lead@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={leadData.phone}
                onChange={(e) => updateLeadData('phone', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <Input
                value={leadData.company}
                onChange={(e) => updateLeadData('company', e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <Input
                value={leadData.source}
                onChange={(e) => updateLeadData('source', e.target.value)}
                placeholder="website, referral, etc."
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={leadData.notes}
              onChange={(e) => updateLeadData('notes', e.target.value)}
              placeholder="Additional notes about the lead"
              rows={3}
            />
          </div>
          <Button 
            onClick={testLeadIngestion} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Ingesting Lead...' : 'Ingest Test Lead'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              Lead ingestion response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            When you ingest a lead, the system will:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Create a new person record in the database</li>
            <li>Assign the lead to the next user in the Round Robin queue</li>
            <li>Return the assigned user ID and person ID</li>
            <li>Rotate to the next user for the next lead</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 