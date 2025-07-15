'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Filter, 
  Mail, 
  Paperclip, 
  Reply, 
  ReplyAll, 
  Forward, 
  Phone, 
  Video, 
  Plus,
  MoreVertical,
  X,
  User,
  Calendar,
  FileText,
  Activity,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Email {
  id: string
  from: string
  subject: string
  preview: string
  date: string
  isRead: boolean
  hasAttachments: boolean
  body: string
  to: string
}

interface Contact {
  name: string
  email: string
  phone: string
  stage: string
  agent: string
  lender: string
  recentConversations: string[]
}

export default function InboxPage() {
  const { user, userRole } = useAuth()
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolder, setCurrentFolder] = useState('inbox')
  const [loading, setLoading] = useState(true)
  const [processingEmail, setProcessingEmail] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(false)

  // Mock data for demonstration
  const mockEmails: Email[] = [
    {
      id: '1',
      from: 'Beth Cuccia Reilly',
      subject: 'your opinion?',
      preview: 'Hi Phillip, I just got a call from Block Management about the handyman invoice...',
      date: 'Jul 9',
      isRead: false,
      hasAttachments: true,
      body: `Hi Phillip,

I just got a call from Block Management about the handyman invoice. They attached the estimate from Pinnacle NWA Handyman LLC. 

Can you take a look and let me know what you think?

Thanks,
Beth`,
      to: 'me'
    },
    {
      id: '2',
      from: 'Supabase Auth',
      subject: 'Confirm Your Signup',
      preview: 'Please confirm your email address to complete your signup...',
      date: 'Jul 7',
      isRead: true,
      hasAttachments: false,
      body: 'Please confirm your email address to complete your signup process.',
      to: 'me'
    },
    {
      id: '3',
      from: 'Ally Spriggs',
      subject: '2-254078: 58 Carrick Drive, Bella Vista, AR 72715',
      preview: 'New lead inquiry for the property at 58 Carrick Drive...',
      date: 'Jul 3',
      isRead: true,
      hasAttachments: false,
      body: 'New lead inquiry for the property at 58 Carrick Drive, Bella Vista, AR 72715. Please contact the client as soon as possible.',
      to: 'me'
    }
  ]

  const mockContact: Contact = {
    name: 'Beth Cuccia Reilly',
    email: 'bethcucciareilly@comcast.net',
    phone: '(707) 567-0710',
    stage: 'Lead',
    agent: 'Phillip Shepard',
    lender: '',
    recentConversations: [
      'your opinion?',
      'Re: Reilly/Oakland property',
      'Re: Oakland Docs',
      'Fwd: report',
      'Re: inspection'
    ]
  }

  useEffect(() => {
    // Simulate loading emails
    setTimeout(() => {
      setEmails(mockEmails)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredEmails = emails.filter(email =>
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email)
    setSelectedContact(mockContact) // In real app, fetch contact data
  }

  const processEmailAsLead = async () => {
    if (!selectedEmail) return
    
    setProcessingEmail(true)
    try {
      // Call the email processing API
      const response = await fetch('/api/email/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailData: {
            subject: selectedEmail.subject,
            from: selectedEmail.from,
            body: selectedEmail.body,
            to: selectedEmail.to
          }
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Mark email as processed
        setEmails(emails.map(email => 
          email.id === selectedEmail.id 
            ? { ...email, isRead: true }
            : email
        ))
        alert(`Lead successfully imported! ${result.lead.name} from ${result.lead.source}`)
      } else {
        throw new Error(result.error || 'Failed to import lead')
      }
    } catch (error) {
      console.error('Error processing email as lead:', error)
      alert('Failed to import lead. Please try again.')
    } finally {
      setProcessingEmail(false)
    }
  }

  const createNote = async () => {
    if (!noteContent.trim() || !selectedContact) return
    
    try {
      // In real app, save note to database
      console.log('Creating note:', noteContent)
      setNoteContent('')
      setShowNoteModal(false)
      alert('Note created successfully!')
    } catch (error) {
      console.error('Error creating note:', error)
      alert('Failed to create note.')
    }
  }

  const folders = [
    { id: 'inbox', name: 'Inbox', count: 1880, icon: Mail },
    { id: 'assigned', name: 'Assigned', count: 45, icon: User },
    { id: 'drafts', name: 'Drafts', count: 12, icon: FileText },
    { id: 'sent', name: 'Sent', count: 234, icon: Mail },
    { id: 'closed', name: 'Closed', count: 567, icon: Calendar }
  ]

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading inbox...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-screen bg-background">
      {/* Left Sidebar - Mailbox Navigation */}
      <div className="w-64 border-r bg-muted/30">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">My Inbox (1880)</h2>
          <nav className="space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon
              return (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentFolder === folder.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {folder.name}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {folder.count}
                  </Badge>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Middle Panel - Email List */}
      <div className="flex-1 flex flex-col border-r">
        {/* Email List Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Select conversations</h3>
            <Select>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="attachments">With Attachments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              onClick={() => handleEmailSelect(email)}
              className={`p-4 border-b cursor-pointer transition-colors ${
                selectedEmail?.id === email.id
                  ? 'bg-primary/5 border-primary/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {!email.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm ${!email.isRead ? 'font-semibold' : ''}`}>
                      {email.from}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {email.hasAttachments && <Paperclip className="h-3 w-3" />}
                      {email.date}
                    </div>
                  </div>
                  <div className={`text-sm mb-1 ${!email.isRead ? 'font-semibold' : ''}`}>
                    {email.subject}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {email.preview}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Email Content */}
      {selectedEmail && (
        <div className="w-96 flex flex-col border-r">
          {/* Email Header */}
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {selectedEmail.from.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{selectedEmail.from}</div>
                  <div className="text-xs text-muted-foreground">to me</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {selectedEmail.date}, 6:31 pm
            </div>
            <div className="font-medium text-sm mb-3">{selectedEmail.subject}</div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
              <Button variant="outline" size="sm">
                <ReplyAll className="h-4 w-4 mr-1" />
                Reply All
              </Button>
              <Button variant="outline" size="sm">
                <Forward className="h-4 w-4 mr-1" />
                Forward
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={processEmailAsLead}
                disabled={processingEmail}
              >
                {processingEmail ? 'Processing...' : 'Import as Lead'}
              </Button>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{selectedEmail.body}</p>
            </div>
            
            {selectedEmail.hasAttachments && (
              <div className="mt-4 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Estimate_1530_from_Pinnacle_NWA_Handyman_LLC.pdf (80 KB)
                  </span>
                </div>
              </div>
            )}

            {/* Add Note Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Add Note</span>
              </div>
              <Textarea
                placeholder="Add a note about this email..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="mb-2"
                rows={3}
              />
              <Button size="sm" onClick={createNote} disabled={!noteContent.trim()}>
                Create Note
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rightmost Panel - Contact Information */}
      {selectedContact && (
        <div className="w-80 bg-muted/30 p-4">
          <div className="mb-4">
            <h3 className="font-medium text-sm mb-1">{selectedContact.name}</h3>
            <p className="text-xs text-muted-foreground">Last Communication 6 hours ago</p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{selectedContact.phone} (mobile)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{selectedContact.email}</span>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Relationships</span>
                <Button variant="ghost" size="sm">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">No relationships</p>
            </div>

            <div>
              <span className="text-sm font-medium">Details</span>
              <div className="mt-2 space-y-1">
                <p className="text-sm">Stage: {selectedContact.stage}</p>
                <p className="text-sm">Agent: {selectedContact.agent}</p>
                <p className="text-sm">Lender: {selectedContact.lender || 'Not assigned'}</p>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Recent Conversations</span>
              <div className="mt-2 space-y-1">
                {selectedContact.recentConversations.map((conversation, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{conversation}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Activity</span>
              <p className="text-sm text-muted-foreground mt-1">No website activity yet</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 