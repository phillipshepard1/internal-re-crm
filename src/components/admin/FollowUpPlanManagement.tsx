'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, Phone, Mail, Users, Target, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getFollowUpPlanTemplates, createFollowUpPlanTemplate, updateFollowUpPlanTemplate, deleteFollowUpPlanTemplate, createFollowUpPlanStep, updateFollowUpPlanStep, deleteFollowUpPlanStep } from '@/lib/database'
import type { FollowUpPlanTemplate, FollowUpPlanStep } from '@/lib/supabase'
import { useDataLoader } from '@/hooks/useDataLoader'

interface FollowUpPlanManagementProps {
  users: any[]
}

export function FollowUpPlanManagement({ users }: FollowUpPlanManagementProps) {
  const [plans, setPlans] = useState<(FollowUpPlanTemplate & { steps?: FollowUpPlanStep[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<(FollowUpPlanTemplate & { steps?: FollowUpPlanStep[] }) | null>(null)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [planSteps, setPlanSteps] = useState<Partial<FollowUpPlanStep>[]>([])
  const [saving, setSaving] = useState(false)

  // Data loader
  const {
    data: plansData,
    loading: plansLoading,
    error: plansError,
    refetch: refetchPlans
  } = useDataLoader(
    async (userId: string, userRole: string) => {
      return await getFollowUpPlanTemplates()
    },
    {
      cacheKey: 'followup_plans',
      cacheTimeout: 60 * 1000, // 1 minute cache
      enabled: !!user
    }
  )

  useEffect(() => {
    if (plansData) {
      setPlans(plansData)
    }
  }, [plansData])

  useEffect(() => {
    setLoading(plansLoading)
    setError(plansError || '')
  }, [plansLoading, plansError])

  const resetForm = () => {
    setPlanName('')
    setPlanDescription('')
    setPlanSteps([])
    setSelectedPlan(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const openEditDialog = (plan: FollowUpPlanTemplate & { steps?: FollowUpPlanStep[] }) => {
    setSelectedPlan(plan)
    setPlanName(plan.name)
    setPlanDescription(plan.description || '')
    setPlanSteps((plan.steps || []).map(step => ({
      id: step.id,
      type: step.type,
      title: step.title,
      description: step.description,
      days_after_assignment: step.days_after_assignment,
      notes: step.notes
    })))
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (plan: FollowUpPlanTemplate & { steps?: FollowUpPlanStep[] }) => {
    setSelectedPlan(plan)
    setDeleteDialogOpen(true)
  }

  const addStep = () => {
    setPlanSteps([...planSteps, {
      type: 'call',
      title: '',
      description: '',
      days_after_assignment: 1,
      notes: ''
    }])
  }

  const removeStep = (index: number) => {
    const newSteps = [...planSteps]
    newSteps.splice(index, 1)
    setPlanSteps(newSteps)
  }

  const updateStep = (index: number, field: keyof FollowUpPlanStep, value: any) => {
    const newSteps = [...planSteps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setPlanSteps(newSteps)
  }

  const handleCreatePlan = async () => {
    if (!planName.trim()) return

    try {
      setSaving(true)
      
      // Create the plan
      const newPlan = await createFollowUpPlanTemplate({
        name: planName.trim(),
        description: planDescription.trim() || null
      })

      // Create the steps
      for (let i = 0; i < planSteps.length; i++) {
        const step = planSteps[i]
        if (step.title?.trim()) {
          await createFollowUpPlanStep({
            plan_id: newPlan.id,
            step_order: i + 1,
            type: step.type || 'call',
            title: step.title.trim(),
            description: step.description?.trim() || null,
            days_after_assignment: step.days_after_assignment || 1,
            notes: step.notes?.trim() || null
          })
        }
      }

      setCreateDialogOpen(false)
      resetForm()
      refetchPlans()
      
    } catch (error) {
      console.error('Error creating plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlan = async () => {
    if (!selectedPlan || !planName.trim()) return

    try {
      setSaving(true)
      
      // Update the plan
      await updateFollowUpPlanTemplate(selectedPlan.id, {
        name: planName.trim(),
        description: planDescription.trim() || null
      })

      // Delete existing steps
      if (selectedPlan.steps) {
        for (const step of selectedPlan.steps) {
          await deleteFollowUpPlanStep(step.id)
        }
      }

      // Create new steps
      for (let i = 0; i < planSteps.length; i++) {
        const step = planSteps[i]
        if (step.title?.trim()) {
          await createFollowUpPlanStep({
            plan_id: selectedPlan.id,
            step_order: i + 1,
            type: step.type || 'call',
            title: step.title.trim(),
            description: step.description?.trim() || null,
            days_after_assignment: step.days_after_assignment || 1,
            notes: step.notes?.trim() || null
          })
        }
      }

      setEditDialogOpen(false)
      resetForm()
      refetchPlans()
      
    } catch (error) {
      console.error('Error updating plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!selectedPlan) return

    try {
      setSaving(true)
      await deleteFollowUpPlanTemplate(selectedPlan.id)
      setDeleteDialogOpen(false)
      setSelectedPlan(null)
      refetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const getStepTypeIcon = (type: string) => {
    const iconMap = {
      call: Phone,
      email: Mail,
      meeting: Users,
      task: Target,
      other: AlertCircle
    }
    const Icon = iconMap[type as keyof typeof iconMap] || AlertCircle
    return <Icon className="h-4 w-4" />
  }

  const getStepTypeLabel = (type: string) => {
    const labelMap = {
      call: 'Call',
      email: 'Email',
      meeting: 'Meeting',
      task: 'Task',
      other: 'Other'
    }
    return labelMap[type as keyof typeof labelMap] || 'Other'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading follow-up plans...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error loading follow-up plans: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Follow-up Plan Templates</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage follow-up plans that can be assigned to leads
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {/* Plans List */}
        <div className="grid gap-4">
          {plans && plans.length > 0 ? (
            plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>
                        {plan.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit plan</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDeleteDialog(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {plan.steps && plan.steps.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium">Plan Steps</h4>
                      <div className="space-y-2">
                        {plan.steps.map((step, index) => (
                          <div key={step.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {getStepTypeIcon(step.type)}
                                {getStepTypeLabel(step.type)}
                              </Badge>
                              <span className="text-sm font-medium">Day {step.days_after_assignment}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{step.title}</p>
                              {step.description && (
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No steps defined for this plan</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No follow-up plans found</p>
              <p className="text-sm mt-2">Create your first follow-up plan to get started</p>
            </div>
          )}
        </div>

        {/* Create Plan Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Follow-up Plan</DialogTitle>
              <DialogDescription>
                Create a new follow-up plan template with steps
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., 7-Day Contact Plan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planDescription">Description</Label>
                <Textarea
                  id="planDescription"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Describe the purpose of this plan..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Plan Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="mr-2 h-3 w-3" />
                    Add Step
                  </Button>
                </div>

                {planSteps.map((step, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Step {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={step.type || 'call'}
                          onValueChange={(value) => updateStep(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Days After Assignment</Label>
                        <Input
                          type="number"
                          min="1"
                          value={step.days_after_assignment || 1}
                          onChange={(e) => updateStep(index, 'days_after_assignment', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={step.title || ''}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="e.g., Initial Contact Call"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Describe what this step involves..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={step.notes || ''}
                        onChange={(e) => updateStep(index, 'notes', e.target.value)}
                        placeholder="Additional notes or tips..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePlan}
                  disabled={!planName.trim() || saving}
                >
                  {saving ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Follow-up Plan</DialogTitle>
              <DialogDescription>
                Modify the follow-up plan template
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editPlanName">Plan Name</Label>
                <Input
                  id="editPlanName"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., 7-Day Contact Plan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPlanDescription">Description</Label>
                <Textarea
                  id="editPlanDescription"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Describe the purpose of this plan..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Plan Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep}>
                    <Plus className="mr-2 h-3 w-3" />
                    Add Step
                  </Button>
                </div>

                {planSteps.map((step, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Step {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={step.type || 'call'}
                          onValueChange={(value) => updateStep(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Days After Assignment</Label>
                        <Input
                          type="number"
                          min="1"
                          value={step.days_after_assignment || 1}
                          onChange={(e) => updateStep(index, 'days_after_assignment', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={step.title || ''}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="e.g., Initial Contact Call"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        placeholder="Describe what this step involves..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={step.notes || ''}
                        onChange={(e) => updateStep(index, 'notes', e.target.value)}
                        placeholder="Additional notes or tips..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePlan}
                  disabled={!planName.trim() || saving}
                >
                  {saving ? 'Updating...' : 'Update Plan'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Follow-up Plan</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedPlan?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDeletePlan}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete Plan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
} 