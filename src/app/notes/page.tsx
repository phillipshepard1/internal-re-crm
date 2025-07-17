'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react'
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/database'
import type { Note } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePagination } from '@/hooks/usePagination'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { useDataLoader } from '@/hooks/useDataLoader'

// Move loadFunction outside component to prevent recreation on every render
const loadNotesData = async (userId: string, userRole: string) => {
  return await getNotes()
}

export default function NotesPage() {
  // All hooks must be called at the top level, before any conditional logic
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    open: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    onConfirm?: () => void
    showCancel?: boolean
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  })

  // Use the robust data loader
  const { data: notes, loading, error, refetch } = useDataLoader(
    loadNotesData,
    {
      cacheKey: 'notes_data',
      cacheTimeout: 2 * 60 * 1000 // 2 minutes cache
    }
  )

  const notesArray = notes || []

  // This hook must be called before any early returns
  const {
    currentData: paginatedNotes,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination({
    data: notesArray,
    itemsPerPage: 10
  })

  const handleCreateNote = () => {
    setEditingNote(null)
    setNoteTitle('')
    setNoteContent('')
    setShowCreateModal(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content || '')
    setShowCreateModal(true)
  }

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return

    try {
      setSaving(true)
      
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: noteTitle,
          content: noteContent,
        })
        refetch() // Refetch to update the data in the table
      } else {
        await createNote({
          title: noteTitle,
          content: noteContent,
        })
        refetch() // Refetch to update the data in the table
      }
      
      setShowCreateModal(false)
      setEditingNote(null)
      setNoteTitle('')
      setNoteContent('')
    } catch (err) {
      console.error('Error saving note:', err)
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Failed to save note',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    setAlertModal({
      open: true,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this note?',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteNote(noteId)
          refetch() // Refetch to update the data in the table
        } catch (err) {
          console.error('Error deleting note:', err)
          setAlertModal({
            open: true,
            title: 'Error',
            message: 'Failed to delete note',
            type: 'error'
          })
        }
      }
    })
  }

  // Now we can have conditional rendering after all hooks are called
  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notes</h2>
            <p className="text-muted-foreground">
              Manage your notes and documentation
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notes</h2>
            <p className="text-muted-foreground">
              Manage your notes and documentation
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
            <h2 className="text-3xl font-bold tracking-tight">Notes</h2>
            <p className="text-muted-foreground">
              Manage your notes and documentation
            </p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCreateNote}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Note
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new note</p>
                </TooltipContent>
              </Tooltip>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
                <DialogDescription>
                  {editingNote ? 'Make changes to your note here.' : 'Add a new note to your collection.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input
                    id="title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Enter note title"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="content" className="text-sm font-medium">Content</label>
                  <Textarea
                    id="content"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter note content"
                    rows={6}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNote} disabled={!noteTitle.trim() || saving}>
                  {saving ? 'Saving...' : (editingNote ? 'Update' : 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Notes</CardTitle>
            <CardDescription>
              View and manage all your notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notesArray.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.title}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {note.content || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {new Date(note.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNote(note)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit note</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete note</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
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
                <AlertDescription>No notes found. Create your first note to get started.</AlertDescription>
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
              {alertModal.showCancel && (
                <Button variant="outline" onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}>
                  Cancel
                </Button>
              )}
              <Button onClick={() => {
                alertModal.onConfirm?.()
                setAlertModal(prev => ({ ...prev, open: false }))
              }}>
                {alertModal.showCancel ? 'Confirm' : 'OK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </TooltipProvider>
  )
} 