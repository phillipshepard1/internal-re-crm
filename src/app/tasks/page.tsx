'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar, Edit } from 'lucide-react'
import { getTasks, createTask, updateTask } from '@/lib/database'
import type { Task } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { AlertModal } from '@/components/ui/alert-modal'

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
]

export default function TasksPage() {
  const { user, userRole } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState('pending')
  const [saving, setSaving] = useState(false)
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
  } = usePagination({
    data: tasks,
    itemsPerPage: 10
  })

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getTasks(undefined, user?.id, userRole || undefined)
      setTasks(data)
    } catch (err) {
      setError('Failed to load tasks')
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, userRole])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleCreateTask = () => {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
    setTaskStatus('pending')
    setShowCreateModal(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description || '')
    setTaskDueDate(task.due_date || '')
    setTaskStatus(task.status)
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
          due_date: taskDueDate,
          status: taskStatus as 'pending' | 'in_progress' | 'completed',
        })
        setTasks(tasks.map(task => 
          task.id === editingTask.id ? updatedTask : task
        ))
      } else {
        const newTask = await createTask({
          title: taskTitle,
          description: taskDescription,
          person_id: null,
          assigned_to: user?.id || '',
          due_date: taskDueDate,
          status: taskStatus as 'pending' | 'in_progress' | 'completed',
        })
        setTasks([newTask, ...tasks])
      }
      
      setShowCreateModal(false)
      setEditingTask(null)
      setTaskTitle('')
      setTaskDescription('')
      setTaskDueDate('')
      setTaskStatus('pending')
    } catch (err) {
      console.error('Error saving task:', err)
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
      setTasks(tasks.map(task => 
        task.id === taskId ? updatedTask : task
      ))
    } catch (err) {
      console.error('Error updating task status:', err)
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
          <Button onClick={loadTasks} className="mt-4">
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
            {tasks.length > 0 ? (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {task.description || '-'}
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
      
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </TooltipProvider>
  )
} 