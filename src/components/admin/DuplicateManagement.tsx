'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

interface DuplicatePerson {
  id: string
  first_name: string
  last_name: string
  email: string[]
  lead_status: string
  created_at: string
}

interface DuplicateGroup {
  email: string
  people: DuplicatePerson[]
}

interface DuplicatesData {
  duplicates: DuplicateGroup[]
  totalDuplicates: number
}

export default function DuplicateManagement() {
  const [duplicates, setDuplicates] = useState<DuplicatesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchDuplicates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/find-duplicates', {
        headers: {
          'Authorization': 'Bearer admin-token' // In production, use proper auth
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch duplicates')
      }
      
      const data = await response.json()
      setDuplicates(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch duplicates')
    } finally {
      setLoading(false)
    }
  }

  const mergeDuplicates = async (primaryPersonId: string, duplicatePersonIds: string[]) => {
    setMerging(primaryPersonId)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/admin/find-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token' // In production, use proper auth
        },
        body: JSON.stringify({
          primaryPersonId,
          duplicatePersonIds
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to merge duplicates')
      }
      
      const data = await response.json()
      setSuccess(data.message)
      
      // Refresh the duplicates list
      await fetchDuplicates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge duplicates')
    } finally {
      setMerging(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'staging': 'bg-yellow-100 text-yellow-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-purple-100 text-purple-800',
      'qualified': 'bg-green-100 text-green-800',
      'converted': 'bg-emerald-100 text-emerald-800',
      'lost': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading duplicates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Duplicate Management</h1>
          <p className="text-muted-foreground">
            Identify and merge duplicate people records
          </p>
        </div>
        <Button onClick={fetchDuplicates} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {duplicates && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Found {duplicates.totalDuplicates} email addresses with duplicate records
              </CardDescription>
            </CardHeader>
          </Card>

          {duplicates.duplicates.map((group, groupIndex) => (
            <Card key={groupIndex}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Email: {group.email}</span>
                  <Badge variant="secondary">{group.people.length} duplicates</Badge>
                </CardTitle>
                <CardDescription>
                  Select the primary record and merge the others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.people.map((person, personIndex) => (
                    <div key={person.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {person.first_name} {person.last_name}
                          </h4>
                          <Badge className={getStatusColor(person.lead_status)}>
                            {person.lead_status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(person.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <div>ID: {person.id}</div>
                        <div>Emails: {person.email.join(', ')}</div>
                      </div>

                      <div className="flex gap-2">
                        {personIndex === 0 ? (
                          <Badge variant="default">Primary (Recommended)</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => mergeDuplicates(
                              group.people[0].id,
                              group.people.slice(1).map(p => p.id)
                            )}
                            disabled={merging === group.people[0].id}
                          >
                            {merging === group.people[0].id ? 'Merging...' : 'Merge into Primary'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {duplicates && duplicates.duplicates.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No duplicate records found!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}