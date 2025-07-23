'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { getPeopleForFollowUpManagement, updatePerson, applyFollowUpFrequencyToLead } from '@/lib/database'
import { getFrequencyDisplayName, getDayOfWeekDisplayName } from '@/lib/database'
import type { Person } from '@/lib/supabase'
import { useDataLoader } from '@/hooks/useDataLoader'
import { useAuth } from '@/contexts/AuthContext'

interface FollowUpFrequencyManagementProps {
  users: any[]
}

export function FollowUpFrequencyManagement({ users }: FollowUpFrequencyManagementProps) {
  const { user, userRole } = useAuth()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [frequencyDialogOpen, setFrequencyDialogOpen] = useState(false)
  const [selectedFrequency, setSelectedFrequency] = useState<'twice_week' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1) // Monday
  const [saving, setSaving] = useState(false)

  // Data loader - get people for follow-up management (assigned leads + non-leads, excluding staging)
  const {
    data: peopleData,
    loading: peopleLoading,
    error: peopleError,
    refetch: refetchPeople
  } = useDataLoader(() => getPeopleForFollowUpManagement(user?.id || undefined, userRole || undefined), {})

  useEffect(() => {
    if (peopleData) {
      setPeople(peopleData)
    }
  }, [peopleData])

  useEffect(() => {
    setLoading(peopleLoading)
    setError(peopleError || '')
  }, [peopleLoading, peopleError])

  const openFrequencyDialog = (person: Person) => {
    setSelectedPerson(person)
    setSelectedFrequency(person.follow_up_frequency || 'weekly')
    setSelectedDayOfWeek(person.follow_up_day_of_week || 1)
    setFrequencyDialogOpen(true)
  }

  const handleUpdateFrequency = async () => {
    if (!selectedPerson) return

    try {
      setSaving(true)
      
      // Update the person's follow-up frequency
      await applyFollowUpFrequencyToLead(
        selectedPerson.id, 
        selectedFrequency, 
        selectedDayOfWeek, 
        selectedPerson.assigned_to
      )
      
      setFrequencyDialogOpen(false)
      setSelectedPerson(null)
      refetchPeople()
      
    } catch (error) {
      console.error('Error updating follow-up frequency:', error)
      setError('Failed to update follow-up frequency')
    } finally {
      setSaving(false)
    }
  }

  const getFrequencyIcon = (frequency: string) => {
    const iconMap = {
      twice_week: Clock,
      weekly: Calendar,
      biweekly: Calendar,
      monthly: Calendar
    }
    const Icon = iconMap[frequency as keyof typeof iconMap] || Calendar
    return <Icon className="h-4 w-4" />
  }

  const getFrequencyColor = (frequency: string) => {
    const colorMap = {
      twice_week: 'bg-red-100 text-red-800',
      weekly: 'bg-blue-100 text-blue-800',
      biweekly: 'bg-green-100 text-green-800',
      monthly: 'bg-purple-100 text-purple-800'
    }
    return colorMap[frequency as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading people...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Follow-up Frequency Management
            </CardTitle>
            <CardDescription>
              Set follow-up frequencies for leads assigned to agents. The system will automatically create follow-ups based on these settings. Staging leads (not yet assigned) are not shown here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {people.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Current Frequency</TableHead>
                    <TableHead>Day of Week</TableHead>
                    <TableHead>Last Follow-up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">
                        {person.first_name} {person.last_name}
                      </TableCell>
                      <TableCell>
                        {person.email?.[0] || 'No email'}
                      </TableCell>
                      <TableCell>
                        {person.assigned_user ? (
                          <span>{person.assigned_user.first_name} {person.assigned_user.last_name}</span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {person.follow_up_frequency ? (
                          <Badge className={getFrequencyColor(person.follow_up_frequency)}>
                            <div className="flex items-center gap-1">
                              {getFrequencyIcon(person.follow_up_frequency)}
                              {getFrequencyDisplayName(person.follow_up_frequency)}
                            </div>
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {person.follow_up_day_of_week !== null && person.follow_up_day_of_week !== undefined ? (
                          getDayOfWeekDisplayName(person.follow_up_day_of_week)
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {person.last_follow_up_date ? (
                          new Date(person.last_follow_up_date).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openFrequencyDialog(person)}
                            >
                              Set Frequency
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set follow-up frequency for this person</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert>
                <AlertDescription>No people found in the system.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Frequency Setting Dialog */}
        <Dialog open={frequencyDialogOpen} onOpenChange={setFrequencyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Follow-up Frequency</DialogTitle>
              <DialogDescription>
                Set how often to follow up with {selectedPerson?.first_name} {selectedPerson?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="frequency">Follow-up Frequency</Label>
                <Select value={selectedFrequency} onValueChange={(value: 'twice_week' | 'weekly' | 'biweekly' | 'monthly') => setSelectedFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twice_week">Twice a Week (Monday & Thursday)</SelectItem>
                    <SelectItem value="weekly">Every Week</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Every Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select value={String(selectedDayOfWeek)} onValueChange={(value) => setSelectedDayOfWeek(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setFrequencyDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleUpdateFrequency} disabled={saving}>
                {saving ? 'Saving...' : 'Save Frequency'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 