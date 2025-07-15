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
  Settings,
  HelpCircle
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
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

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
  lastUpdated?: string
}

interface Contact {
  name: string
  email: string
  phone: string
  stage: string
  agent: string
  lender: string
  recentConversations: string[]
  lastUpdated?: string
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
  const [gmailConnected, setGmailConnected] = useState(false)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [currentFilter, setCurrentFilter] = useState('all')

  // Mock data for different folders
  const mockEmailsByFolder: Record<string, Email[]> = {
    inbox: [
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
        to: 'me',
        lastUpdated: '2024-07-10T12:00:00Z'
      },
      {
        id: '2',
        from: 'John Smith',
        subject: 'Property Inquiry - 123 Main St',
        preview: 'Hi, I saw your listing for the property at 123 Main St and I\'m very interested...',
        date: 'Jul 7',
        isRead: true,
        hasAttachments: false,
        body: 'Hi, I saw your listing for the property at 123 Main St and I\'m very interested in scheduling a viewing. Could you please let me know what times are available this week? Thanks, John',
        to: 'me',
        lastUpdated: '2024-07-09T10:00:00Z'
      },
      {
        id: '3',
        from: 'Sarah Johnson',
        subject: 'Client Update - Closing Documents',
        preview: 'Hi Phillip, I wanted to update you on the closing process for the Bella Vista property...',
        date: 'Jul 3',
        isRead: true,
        hasAttachments: false,
        body: 'Hi Phillip, I wanted to update you on the closing process for the Bella Vista property. All documents have been signed and we\'re ready to proceed. Thanks, Sarah',
        to: 'me',
        lastUpdated: '2024-07-08T14:00:00Z'
      },
      {
        id: '4',
        from: 'Mike Davis',
        subject: 'Prospect - Interested in Investment Properties',
        preview: 'Hello, I\'m looking to invest in rental properties in the area...',
        date: 'Jul 2',
        isRead: true,
        hasAttachments: false,
        body: 'Hello, I\'m looking to invest in rental properties in the area. I have a budget of $300k and would like to see what\'s available. Thanks, Mike',
        to: 'me',
        lastUpdated: '2024-07-07T09:00:00Z'
      }
    ],
    assigned: [
      {
        id: '5',
        from: 'Lisa Chen',
        subject: 'Assigned Lead - 456 Oak Ave',
        preview: 'This lead has been assigned to you for follow-up...',
        date: 'Jul 8',
        isRead: false,
        hasAttachments: true,
        body: 'This lead has been assigned to you for follow-up. Please contact them within 24 hours.',
        to: 'me',
        lastUpdated: '2024-07-09T11:00:00Z'
      },
      {
        id: '6',
        from: 'David Wilson',
        subject: 'Assigned Prospect - Investment Property',
        preview: 'Prospect assigned for investment property consultation...',
        date: 'Jul 6',
        isRead: true,
        hasAttachments: false,
        body: 'Prospect assigned for investment property consultation. They are looking for properties in the $400k range.',
        to: 'me',
        lastUpdated: '2024-07-08T15:00:00Z'
      }
    ],
    drafts: [
      {
        id: '7',
        from: 'me',
        subject: 'Draft: Response to Beth Reilly',
        preview: 'Draft response to the handyman invoice inquiry...',
        date: 'Jul 9',
        isRead: true,
        hasAttachments: false,
        body: 'Hi Beth, Thanks for forwarding the handyman estimate. I\'ve reviewed it and...',
        to: 'Beth Cuccia Reilly',
        lastUpdated: '2024-07-09T13:00:00Z'
      },
      {
        id: '8',
        from: 'me',
        subject: 'Draft: Property Listing Update',
        preview: 'Draft email updating property listing information...',
        date: 'Jul 8',
        isRead: true,
        hasAttachments: true,
        body: 'Hi team, I wanted to update you on the property listing changes...',
        to: 'Team',
        lastUpdated: '2024-07-08T16:00:00Z'
      }
    ],
    sent: [
      {
        id: '9',
        from: 'me',
        subject: 'Re: Property Inquiry - 789 Pine St',
        preview: 'Sent response to property inquiry...',
        date: 'Jul 7',
        isRead: true,
        hasAttachments: false,
        body: 'Hi Sarah, Thanks for your inquiry about 789 Pine St. I\'d be happy to show you the property...',
        to: 'Sarah Johnson',
        lastUpdated: '2024-07-07T10:00:00Z'
      },
      {
        id: '10',
        from: 'me',
        subject: 'Property Update - 123 Main St',
        preview: 'Sent property update to interested buyer...',
        date: 'Jul 5',
        isRead: true,
        hasAttachments: true,
        body: 'Hi John, I wanted to update you on the status of 123 Main St...',
        to: 'John Smith',
        lastUpdated: '2024-07-05T11:00:00Z'
      }
    ],
    closed: [
      {
        id: '11',
        from: 'Closing Team',
        subject: 'Closed Deal - 456 Oak Ave',
        preview: 'Deal closed successfully for 456 Oak Ave...',
        date: 'Jul 1',
        isRead: true,
        hasAttachments: true,
        body: 'Congratulations! The deal for 456 Oak Ave has been closed successfully.',
        to: 'me',
        lastUpdated: '2024-07-01T12:00:00Z'
      },
      {
        id: '12',
        from: 'Legal Team',
        subject: 'Closed Transaction - 789 Pine St',
        preview: 'Transaction closed for 789 Pine St property...',
        date: 'Jun 28',
        isRead: true,
        hasAttachments: false,
        body: 'The transaction for 789 Pine St has been completed and closed.',
        to: 'me',
        lastUpdated: '2024-06-28T13:00:00Z'
      }
    ]
  }

  // Get current folder emails
  const currentFolderEmails = mockEmailsByFolder[currentFolder] || mockEmailsByFolder.inbox

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

  // Generate dynamic contact information based on selected email
  const getContactFromEmail = (email: Email): Contact => {
    // Extract name from email sender
    const senderName = email.from
    
    // Generate email based on sender name
    const emailAddress = email.from.toLowerCase().replace(/\s+/g, '.') + '@example.com'
    
    // Generate consistent phone number based on sender name (for demo purposes)
    const nameHash = email.from.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const phoneNumber = `(${Math.floor((nameHash % 900) + 100)}) ${Math.floor((nameHash % 900) + 100)}-${Math.floor((nameHash % 9000) + 1000)}`
    
    // Determine stage based on email subject/content
    let stage = 'Lead'
    const subjectLower = email.subject.toLowerCase()
    const bodyLower = email.body.toLowerCase()
    
    if (subjectLower.includes('client') || subjectLower.includes('closing') || bodyLower.includes('closing')) {
      stage = 'Client'
    } else if (subjectLower.includes('prospect') || subjectLower.includes('interested') || bodyLower.includes('interested')) {
      stage = 'Prospect'
    } else if (subjectLower.includes('lead') || subjectLower.includes('inquiry') || bodyLower.includes('viewing')) {
      stage = 'Lead'
    }
    
    // Generate recent conversations based on email subject and content
    const recentConversations = [
      email.subject,
      `Re: ${email.subject}`,
      'Property inquiry',
      'Follow-up call',
      'Document request'
    ]
    
    // Determine lender based on stage and random chance
    let lender = 'Not assigned'
    if (stage === 'Client' && Math.random() > 0.3) {
      const lenders = ['ABC Mortgage', 'XYZ Bank', 'First National', 'Home Loans Inc']
      lender = lenders[Math.floor(Math.random() * lenders.length)]
    }
    
    return {
      name: senderName,
      email: emailAddress,
      phone: phoneNumber,
      stage: stage,
      agent: 'Phillip Shepard', // Default agent
      lender: lender,
      recentConversations: recentConversations,
      lastUpdated: email.lastUpdated || email.date // fallback to email.date if lastUpdated missing
    }
  }

  useEffect(() => {
    // Simulate loading emails
    setTimeout(() => {
      setEmails(currentFolderEmails)
      setLoading(false)
    }, 1000)
  }, [currentFolder, currentFolderEmails])

  // Check Gmail connection status
  useEffect(() => {
    checkGmailConnection()
  }, [])

  // Auto-load emails when Gmail is connected
  useEffect(() => {
    if (gmailConnected && !loadingEmails) {
      loadGmailEmails()
    }
  }, [gmailConnected])

  const checkGmailConnection = async () => {
    try {
      // Check if Gmail environment variables are set
      const response = await fetch('/api/gmail/status')
      const data = await response.json()
      setGmailConnected(data.connected)
    } catch (error) {
      console.error('Error checking Gmail connection:', error)
      setGmailConnected(false)
    }
  }

  const loadGmailEmails = async () => {
    setLoadingEmails(true)
    try {
      // Simulate Gmail API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For now, just refresh the mock data to simulate loading from Gmail
      // This will be replaced with real Gmail API call when connected
      const refreshedEmails = [
        ...currentFolderEmails,
        {
          id: '13',
          from: 'Jennifer Wilson',
          subject: 'New Lead Inquiry - 456 Oak Ave',
          preview: 'Hi, I saw your listing for the property at 456 Oak Ave. I would like to schedule a viewing...',
          date: 'Jul 10',
          isRead: false,
          hasAttachments: false,
          body: `Hi there,

I saw your listing for the property at 456 Oak Ave and I'm very interested in scheduling a viewing. 

Could you please let me know what times are available this week?

Thanks,
Jennifer`,
          to: 'me',
          lastUpdated: '2024-07-10T12:00:00Z'
        },
        {
          id: '14',
          from: 'Robert Chen',
          subject: 'Zillow Lead - Property at 789 Pine St',
          preview: 'You have a new lead from Zillow for the property at 789 Pine St...',
          date: 'Jul 10',
          isRead: false,
          hasAttachments: false,
          body: `New lead from Zillow:

Name: Robert Chen
Email: robert.chen@email.com
Phone: (555) 987-6543
Property: 789 Pine St
Message: I'm interested in this property and would like more information about financing options.`,
          to: 'me',
          lastUpdated: '2024-07-10T13:00:00Z'
        }
      ]
      
      setEmails(currentFolderEmails)
      toast.success('Gmail Emails Loaded', {
        description: `Successfully loaded ${refreshedEmails.length} emails. Currently showing mock data - will show real emails when API keys are configured.`,
        duration: 5000,
      })
      
    } catch (error) {
      console.error('Error loading Gmail emails:', error)
      toast.error('Failed to Load Emails', {
        description: 'There was an error loading emails from Gmail. Please try again.',
        duration: 6000,
      })
    } finally {
      setLoadingEmails(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      console.log(`Searching for: "${query}"`)
    }
  }

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter)
    const filterNames = {
      all: 'All emails',
      unread: 'Unread emails',
      attachments: 'Emails with attachments'
    }
    toast.info('Filter Applied', {
      description: `Showing ${filterNames[filter as keyof typeof filterNames]}`,
      duration: 3000,
    })
    console.log(`Filter changed to: ${filter}`)
  }

  const filteredEmails = emails.filter(email => {
    // First apply search filter
    const matchesSearch = 
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Then apply type filter
    switch (currentFilter) {
      case 'unread':
        return !email.isRead
      case 'attachments':
        return email.hasAttachments
      default:
        return true
    }
  })

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email)
    setSelectedContact(getContactFromEmail(email)) // In real app, fetch contact data
  }

  const processEmailAsLead = async () => {
    if (!selectedEmail) return
    
    setProcessingEmail(true)
    try {
      // For now, simulate the email processing with mock data
      // This will be replaced with real API call when Gmail is connected
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay
      
      // Simulate successful lead creation
      const mockLeadData = {
        name: selectedEmail.from,
        email: selectedEmail.from.toLowerCase().replace(' ', '.') + '@example.com',
        phone: '(555) 123-4567',
        source: 'email',
        message: selectedEmail.body.substring(0, 100) + '...'
      }
      
      // Mark email as processed
      setEmails(emails.map(email => 
        email.id === selectedEmail.id 
          ? { ...email, isRead: true }
          : email
      ))
      
      // Show success message with more details
      toast.success('Lead Imported Successfully', {
        description: `${mockLeadData.name} has been added as a new lead and assigned to an agent via Round Robin.`,
        duration: 5000,
      })
      
    } catch (error) {
      console.error('Error processing email as lead:', error)
      toast.error('Failed to Import Lead', {
        description: 'There was an error processing this email. Please try again.',
        duration: 6000,
      })
    } finally {
      setProcessingEmail(false)
    }
  }

  const createNote = async () => {
    if (!noteContent.trim() || !selectedContact) return
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real implementation, this would save to the database
      console.log('Creating note for contact:', selectedContact.name)
      console.log('Note content:', noteContent)
      
      // Show success message
      toast.success('Note Created', {
        description: `Note added to ${selectedContact.name}'s profile successfully.`,
        duration: 3000,
      })
      
      // Clear the note content
      setNoteContent('')
      
    } catch (error) {
      console.error('Error creating note:', error)
      toast.error('Failed to Create Note', {
        description: 'There was an error saving the note. Please try again.',
        duration: 6000,
      })
    }
  }

  const handleReply = () => {
    if (!selectedEmail) return
    toast.info('Reply Email', {
      description: `Composing reply to ${selectedEmail.from}`,
      duration: 3000,
    })
  }

  const handleReplyAll = () => {
    if (!selectedEmail) return
    toast.info('Reply All', {
      description: `Composing reply to all recipients of "${selectedEmail.subject}"`,
      duration: 3000,
    })
  }

  const handleForward = () => {
    if (!selectedEmail) return
    toast.info('Forward Email', {
      description: `Forwarding "${selectedEmail.subject}" from ${selectedEmail.from}`,
      duration: 3000,
    })
  }

  const handleFolderChange = (folderId: string) => {
    setCurrentFolder(folderId)
    
    // Simulate different email counts for different folders
    const folderCounts = {
      inbox: 1880,
      assigned: 45,
      drafts: 12,
      sent: 234,
      closed: 567
    }
    
    const folderNames = {
      inbox: 'Inbox',
      assigned: 'Assigned',
      drafts: 'Drafts', 
      sent: 'Sent',
      closed: 'Closed'
    }
    
    const folderName = folderNames[folderId as keyof typeof folderNames]
    const emailCount = folderCounts[folderId as keyof typeof folderCounts]
    
    console.log(`Switched to ${folderName} folder`)
  }

  const folders = [
    { id: 'inbox', name: 'Inbox', count: mockEmailsByFolder.inbox.length, icon: Mail },
    { id: 'assigned', name: 'Assigned', count: mockEmailsByFolder.assigned.length, icon: User },
    { id: 'drafts', name: 'Drafts', count: mockEmailsByFolder.drafts.length, icon: FileText },
    { id: 'sent', name: 'Sent', count: mockEmailsByFolder.sent.length, icon: Mail },
    { id: 'closed', name: 'Closed', count: mockEmailsByFolder.closed.length, icon: Calendar }
  ]

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading inbox...</p>
        </div>
      </div>
    )
  }

  return (
    <div className=" container flex-1 flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
      {/* Left Sidebar - Mailbox Navigation */}
      <div className="w-[220px] border-r bg-muted/20 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            {currentFolder === 'inbox' ? 'My Inbox' : 
             currentFolder === 'assigned' ? 'Assigned' :
             currentFolder === 'drafts' ? 'Drafts' :
             currentFolder === 'sent' ? 'Sent' :
             currentFolder === 'closed' ? 'Closed' : 'My Inbox'} 
            ({currentFolderEmails.length})
          </h2>
          
          {/* Gmail Connection Status */}
          <div className="mb-4 p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gmail Integration</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-muted-foreground">
                Ready for Demo
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadGmailEmails}
              disabled={loadingEmails}
              className="w-full mt-2"
            >
              {loadingEmails ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
              ) : (
                <Mail className="h-3 w-3 mr-1" />
              )}
              {loadingEmails ? 'Loading...' : 'Load Gmail Emails'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Currently showing mock data - will show real emails when API keys are configured
            </p>
          </div>
          
          <nav className="space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon
              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderChange(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    currentFolder === folder.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted/60 text-muted-foreground'
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
      <div className="flex-1 flex flex-col border-r min-w-0">
        {/* Email List Header */}
        <div className="p-4 border-b bg-background flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Select conversations</h3>
            <Select onValueChange={handleFilterChange} value={currentFilter}>
              <SelectTrigger className="w-32 h-8">
                <Filter className="h-3 w-3 mr-2" />
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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredEmails.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground mb-2">No emails found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No emails in this folder'}
                </p>
              </div>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleEmailSelect(email)}
                className={`p-3 border-b cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/30 border-transparent'
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
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Email Content */}
      {selectedEmail && (
        <div className="w-[455px] flex flex-col border-r flex-shrink-0">
          {/* Email Header */}
          <div className="p-4 border-b bg-background flex-shrink-0">
            {/* Email Details */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {selectedEmail.from.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{selectedEmail.from}</div>
                  <div className="text-xs text-muted-foreground">to me</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedEmail.date}, 6:31 pm
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            <div className="prose prose-sm max-w-none mb-4 p-4 border rounded-lg bg-background">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEmail.body}</p>
              
              {selectedEmail.hasAttachments && (
                <div className="mt-4 p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      Estimate_1530_from_Pinnacle_NWA_Handyman_LLC.pdf (80 KB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="outline" size="sm" className="h-8" onClick={handleReply}>
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={handleReplyAll}>
                <ReplyAll className="h-3 w-3 mr-1" />
                Reply All
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={handleForward}>
                <Forward className="h-3 w-3 mr-1" />
                Forward
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-8"
                onClick={processEmailAsLead}
                disabled={processingEmail}
              >
                {processingEmail ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Process as Lead
              </Button>
            </div>

            {/* Add Note Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Add Note</span>
              </div>
              <Textarea
                placeholder="Add a note about this email..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="text-sm"
                rows={2}
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
        <div className="w-80 bg-muted/20 p-4 relative flex-shrink-0">
          {/* Contact Info */}
          <div className="mb-4">
            <h3 className="font-medium text-sm mb-1">{selectedContact.name}</h3>
            {selectedContact?.lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Activity className="h-3 w-3" />
                <span>
                  Last Communication: {formatDistanceToNow(new Date(selectedContact.lastUpdated), { addSuffix: true })}
                </span>
              </div>
            )}
            {selectedContact.lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Contact info updated: {selectedContact.lastUpdated}
              </p>
            )}
          </div>

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
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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

          {/* Bottom Actions */}
          <div className="absolute bottom-4 right-4">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 