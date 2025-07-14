'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react'
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/database'
import type { Note } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertModal } from '@/components/ui/alert-modal'

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const data = await getNotes()
      setNotes(data)
    } catch (err) {
      setError('Failed to load notes')
      console.error('Error loading notes:', err)
    } finally {
      setLoading(false)
    }
  }

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
        const updatedNote = await updateNote(editingNote.id, {
          title: noteTitle,
          content: noteContent,
        })
        setNotes(notes.map(note => 
          note.id === editingNote.id ? updatedNote : note
        ))
      } else {
        const newNote = await createNote({
          title: noteTitle,
          content: noteContent,
        })
        setNotes([newNote, ...notes])
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
          setNotes(notes.filter(note => note.id !== noteId))
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
          <Button onClick={loadNotes} className="mt-4">
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
            {notes.length > 0 ? (
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
                  {notes.map((note) => (
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
            ) : (
              <Alert>
                <AlertDescription>No notes found. Create your first note to get started.</AlertDescription>
                <Button onClick={handleCreateNote} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Note
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
        onConfirm={alertModal.onConfirm}
        showCancel={alertModal.showCancel}
      />
    </TooltipProvider>
  )
} 