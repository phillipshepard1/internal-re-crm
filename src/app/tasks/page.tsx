'use client'

import { useState, memo, useEffect } from 'react'
import { Plus, Eye, Edit, Trash2, Calendar, Clock, CheckCircle, AlertCircle, Phone, Mail, User, AtSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { getTasks, createTask, updateTask, searchLeadsByName } from '@/lib/database'
import type { Task } from '@/lib/supabase'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
]

// Move loadFunction outside component to prevent recreation on every render
const loadTasksData = async (userId: string, userRole: string | null) => {
  return await getTasks(undefined, userId, userRole || undefined)
}

function TasksPage() {
  const { user, userRole } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState('pending')
  const [saving, setSaving] = useState(false)
  
  // @mention functionality
  const [leadSearchTerm, setLeadSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [showLeadSearch, setShowLeadSearch] = useState(false)
  
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

  // Use the robust data loader
  const { data: tasks = [], loading, error, refetch } = useDataLoader(
    loadTasksData,
    {
      cacheKey: 'tasks_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  // Lead search functionality
  useEffect(() => {
    const searchLeads = async () => {
      console.log('Search triggered:', { leadSearchTerm, user: user?.id, userRole })
      
      if (leadSearchTerm.trim().length >= 2 && user && user.id) {
        try {
          console.log('Searching for:', leadSearchTerm)
          const results = await searchLeadsByName(leadSearchTerm, user.id, userRole || undefined)
          console.log('Search results:', results)
          setSearchResults(results)
          setShowLeadSearch(true)
        } catch (error) {
          console.error('Error searching leads:', error)
          setSearchResults([])
        }
      } else {
        console.log('Search conditions not met:', { 
          termLength: leadSearchTerm.trim().length, 
          hasUser: !!user, 
          hasUserId: !!user?.id 
        })
        setSearchResults([])
        setShowLeadSearch(false)
      }
    }

    const debounceTimer = setTimeout(searchLeads, 300)
    return () => clearTimeout(debounceTimer)
  }, [leadSearchTerm, user?.id, userRole])

  const handleLeadSelect = (lead: any) => {
    setSelectedLead(lead)
    setLeadSearchTerm(lead.name)
    setShowLeadSearch(false)
  }

  const handleClearLead = () => {
    setSelectedLead(null)
    setLeadSearchTerm('')
    setSearchResults([])
    setShowLeadSearch(false)
  }

  const {
    currentData: paginatedTasks,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination<Task>({
    data: tasks || [],
    itemsPerPage: 10
  })

  const handleCreateTask = () => {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
    setTaskStatus('pending')
    setSelectedLead(null)
    setLeadSearchTerm('')
    setSearchResults([])
    setShowLeadSearch(false)
    setShowCreateModal(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description || '')
    setTaskDueDate(task.due_date || '')
    setTaskStatus(task.status)
    
    // If task has a person_id and people data, populate the lead search
    if (task.person_id && task.people) {
      setSelectedLead({
        id: task.person_id,
        name: `${task.people.first_name} ${task.people.last_name}`,
        email: task.people.email[0]
      })
      setLeadSearchTerm(`${task.people.first_name} ${task.people.last_name}`)
    } else if (task.person_id) {
      // If we have person_id but no people data, just set the ID
      setSelectedLead({ id: task.person_id })
      setLeadSearchTerm('')
    } else {
      setSelectedLead(null)
      setLeadSearchTerm('')
    }
    
    setSearchResults([])
    setShowLeadSearch(false)
    setShowCreateModal(true)
  }

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return

    try {
      setSaving(true)
      
      if (editingTask) {
        const updatedTask = await updateTask(editingTask.id, {
          title: taskTitle,
          description: taskDescription,
          person_id: selectedLead?.id || null,
          due_date: taskDueDate,
          status: taskStatus as 'pending' | 'in_progress' | 'completed',
        })
        refetch() // Refetch to update the data in the table
      } else {
        const newTask = await createTask({
          title: taskTitle,
          description: taskDescription,
          person_id: selectedLead?.id || null,
          assigned_to: user?.id || '',
          due_date: taskDueDate,
          status: taskStatus as 'pending' | 'in_progress' | 'completed',
        })
        refetch() // Refetch to update the data in the table
      }
      
      setShowCreateModal(false)
      setEditingTask(null)
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
      setTaskStatus('pending')
      setSelectedLead(null)
      setLeadSearchTerm('')
      setSearchResults([])
      setShowLeadSearch(false)
    } catch (err) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to save task',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updatedTask = await updateTask(taskId, { 
        status: newStatus as 'pending' | 'in_progress' | 'completed' 
      })
      refetch() // Refetch to update the data in the table
    } catch (err) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to update task status',
        type: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground">
              Manage your tasks and assignments
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground">
              Manage your tasks and assignments
            </p>
          </div>
        </div>
        <Alert>
          <AlertDescription className="text-destructive">{error}</AlertDescription>
          <Button onClick={refetch} className="mt-4">
            Try Again
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground">
              Manage your tasks and assignments
            </p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCreateTask}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new task</p>
                </TooltipContent>
              </Tooltip>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Make changes to your task here.' : 'Add a new task to your list.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="description"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Enter task description"
                  />
                </div>
                
                {/* @mention Lead Search */}
                <div className="grid gap-2">
                  <label htmlFor="leadSearch" className="text-sm font-medium flex items-center">
                    <AtSign className="mr-1 h-4 w-4" />
                    Link to Lead (Optional)
                  </label>
                  <div className="relative">
                    <Input
                      id="leadSearch"
                      value={leadSearchTerm}
                      onChange={(e) => setLeadSearchTerm(e.target.value)}
                      placeholder="Type @ to search leads..."
                      className="pr-8"
                    />
                    {selectedLead && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearLead}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showLeadSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        searchResults.map((lead) => (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => handleLeadSelect(lead)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-gray-500">{lead.email}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No leads found for "{leadSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Selected Lead Display */}
                  {selectedLead && (
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {selectedLead.name || `Lead ID: ${selectedLead.id}`}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="status" className="text-sm font-medium">Status</label>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTask} disabled={!taskTitle.trim() || saving}>
                  {saving ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
            <CardDescription>
              View and manage all your tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(tasks || []).length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Linked Lead</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTasks.map((task: Task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {task.description || '-'}
                      </TableCell>
                      <TableCell>
                        {task.people ? (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {task.people.first_name} {task.people.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {task.people.email[0]}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit task</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={goToPage}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
                />
              </div>
            </>
            ) : (
              <Alert>
                <AlertDescription>No tasks found. Create your first task to get started.</AlertDescription>
                <Button onClick={handleCreateTask} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Task
                </Button>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      
              <Dialog open={alertModal.open} onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{alertModal.title}</DialogTitle>
              <DialogDescription>{alertModal.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </TooltipProvider>
  )
}

export default memo(TasksPage) 