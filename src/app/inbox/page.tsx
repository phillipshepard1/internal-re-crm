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
  HelpCircle,
  AlertTriangle,
  Trash2,
  Star,
  Circle,
  Users,
  Tag,
  Bell,
  MessageSquare,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [gmailLabels, setGmailLabels] = useState<Array<{
    id: string
    name: string
    type: string
    messagesTotal?: number
    messagesUnread?: number
  }>>([])
  const [loadingLabels, setLoadingLabels] = useState(false)
  const [hasMoreEmails, setHasMoreEmails] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [initialFolderSet, setInitialFolderSet] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [composeMode, setComposeMode] = useState<'reply' | 'replyAll' | 'forward'>('reply')
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })
  const [sendingEmail, setSendingEmail] = useState(false)





  // Check Gmail connection status
  useEffect(() => {
    checkGmailConnection()
  }, [])

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const email = urlParams.get('email')

    if (success === 'true' && email) {
      toast.success('Gmail Connected Successfully', {
        description: `Your Gmail account (${email}) has been connected successfully!`,
        duration: 5000,
      })
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
      // Refresh Gmail connection status
    checkGmailConnection()
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'Missing OAuth parameters',
        'invalid_state': 'Invalid OAuth state',
        'token_exchange_failed': 'Failed to exchange OAuth tokens',
        'storage_failed': 'Failed to store Gmail tokens',
        'callback_failed': 'OAuth callback failed'
      }
      
      toast.error('Gmail Connection Failed', {
        description: errorMessages[error] || 'An error occurred during Gmail connection',
        duration: 6000,
      })
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Load emails and labels when Gmail connection status changes
  useEffect(() => {
    if (gmailConnected && user?.id) {
      // Load real emails and labels when Gmail is connected
      loadGmailEmails()
      loadGmailLabels()
    } else if (!gmailConnected) {
      // Don't show any data when Gmail is not connected
      setEmails([])
      setLoading(false)
    }
  }, [gmailConnected, user?.id])

  const checkGmailConnection = async () => {
    try {
      // Check if Gmail environment variables are set
      const response = await fetch(`/api/gmail/status?userId=${user?.id}`)
      const data = await response.json()
      setGmailConnected(data.userConnected)
    } catch (error) {
      console.error('Error checking Gmail connection:', error)
      setGmailConnected(false)
    }
  }

  const connectGmail = async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    try {
      // Get OAuth URL
      const response = await fetch('/api/gmail/setup/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate OAuth URL')
      }

      // Redirect to Gmail OAuth
      window.location.href = data.authUrl

    } catch (error) {
      console.error('Error connecting Gmail:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect Gmail')
    }
  }

  const disconnectGmail = async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/gmail/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          revokeAccess: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Gmail')
      }

      if (data.success) {
        toast.success('Gmail Disconnected', {
          description: 'Your Gmail account has been disconnected successfully.',
          duration: 5000,
        })
        // Update local state
        setGmailConnected(false)
        setGmailLabels([])
        setEmails([])
        setSelectedEmail(null) // Clear selected email
        setSelectedContact(null) // Clear selected contact
        setNextPageToken(undefined)
        setHasMoreEmails(false)
        setInitialFolderSet(false)
        setLoading(false) // Immediately stop loading
        setShowDisconnectModal(false) // Close modal
      } else {
        throw new Error(data.message || 'Failed to disconnect Gmail')
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
      toast.error('Failed to Disconnect Gmail', {
        description: error instanceof Error ? error.message : 'There was an error disconnecting your Gmail account.',
        duration: 6000,
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const loadGmailLabels = useCallback(async () => {
    if (!user?.id) {
      return
    }

    setLoadingLabels(true)
    try {
      const response = await fetch('/api/gmail/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('Gmail Labels received:', data.labels)
        
        // Debug: Log the counts for each label
        console.log('=== Labels received from API ===')
        data.labels.forEach((label: any) => {
          console.log(`Label: ${label.name}, Total: ${label.messagesTotal}, Unread: ${label.messagesUnread}`)
        })
        
        // Check for duplicate labels
        const labelNames = data.labels.map((label: any) => label.name)
        const duplicates = labelNames.filter((name: string, index: number) => labelNames.indexOf(name) !== index)
        if (duplicates.length > 0) {
          console.warn('Duplicate labels found:', duplicates)
        }
        
        setGmailLabels(data.labels)
        
        // Set current folder to INBOX if it exists and we haven't set it yet
        if (data.labels.length > 0 && !initialFolderSet) {
          const inboxLabel = data.labels.find((label: any) => label.name === 'INBOX')
          if (inboxLabel) {
            setCurrentFolder(inboxLabel.id)
            setInitialFolderSet(true)
          }
        }
      } else {
        console.error('Failed to load Gmail labels:', data.error)
      }
    } catch (error) {
      console.error('Error loading Gmail labels:', error)
    } finally {
      setLoadingLabels(false)
    }
  }, [user?.id, initialFolderSet])

  const loadMoreEmails = async () => {
    if (!user?.id || !gmailConnected || loadingMore) {
      return
    }

    setLoadingMore(true)
    try {
      const response = await fetch('/api/gmail/fetch-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          maxResults: 100,
          labelId: currentFolder,
          pageToken: nextPageToken
        })
      })

      const data = await response.json()

      if (response.ok && data.success && data.emails) {
        // Transform Gmail API response to our Email interface
        const transformedEmails: Email[] = data.emails.map((gmailEmail: any) => ({
          id: gmailEmail.id,
          from: gmailEmail.from,
          subject: gmailEmail.subject,
          preview: gmailEmail.snippet || gmailEmail.body?.substring(0, 100) || '',
          date: new Date(parseInt(gmailEmail.internalDate)).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          isRead: false,
          hasAttachments: false,
          body: gmailEmail.body || '',
          to: gmailEmail.to || 'me',
          lastUpdated: new Date(parseInt(gmailEmail.internalDate)).toISOString()
        }))

        // Append new emails to existing ones
        setEmails(prevEmails => [...prevEmails, ...transformedEmails])
        
        // Store the next page token and check if there are more emails to load
        setNextPageToken(data.nextPageToken)
        setHasMoreEmails(!!data.nextPageToken)
        
        toast.success('More Emails Loaded', {
          description: `Loaded ${transformedEmails.length} more emails.`,
          duration: 2000,
        })
      } else {
        throw new Error(data.message || 'Failed to load more emails')
      }
    } catch (error) {
      console.error('Error loading more emails:', error)
      toast.error('Failed to Load More Emails', {
        description: error instanceof Error ? error.message : 'There was an error loading more emails.',
        duration: 4000,
      })
    } finally {
      setLoadingMore(false)
    }
  }

  const loadGmailEmails = useCallback(async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setLoadingEmails(true)
    setLoading(true) // Also set main loading state
    try {
      // Determine if we should load emails for a specific label
      let requestBody: any = {
        userId: user.id,
        maxResults: 100 // Increased from 20 to 100
      }
      
      // If we're on a Gmail label (not a mock folder), include the label ID
      if (gmailConnected && gmailLabels.length > 0) {
        const currentLabel = gmailLabels.find(label => label.id === currentFolder)
        if (currentLabel) {
          requestBody.labelId = currentFolder
        }
      }
      
      // Fetch real emails from Gmail API
      const response = await fetch('/api/gmail/fetch-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails')
      }

      if (data.success && data.emails) {
        // Transform Gmail API response to our Email interface
        const transformedEmails: Email[] = data.emails.map((gmailEmail: any) => ({
          id: gmailEmail.id,
          from: gmailEmail.from,
          subject: gmailEmail.subject,
          preview: gmailEmail.snippet || gmailEmail.body?.substring(0, 100) || '',
          date: new Date(parseInt(gmailEmail.internalDate)).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          isRead: gmailEmail.isRead ?? false,
          hasAttachments: gmailEmail.hasAttachments ?? false,
          body: gmailEmail.body || '',
          to: gmailEmail.to || 'me',
          lastUpdated: new Date(parseInt(gmailEmail.internalDate)).toISOString()
        }))

        setEmails(transformedEmails)
        
        // Get label name for the toast message
        let labelName = 'your Gmail account'
        if (requestBody.labelId) {
          const currentLabel = gmailLabels.find(label => label.id === requestBody.labelId)
          if (currentLabel) {
            labelName = currentLabel.name
          }
        }
        
        toast.success('Gmail Emails Loaded', {
          description: `Successfully loaded ${transformedEmails.length} emails from ${labelName}.`,
          duration: 5000,
        })
      } else {
        throw new Error(data.message || 'Failed to load emails')
      }
      
    } catch (error) {
      console.error('Error loading Gmail emails:', error)
      toast.error('Failed to Load Emails', {
        description: error instanceof Error ? error.message : 'There was an error loading emails from Gmail. Please try again.',
        duration: 6000,
      })
      // Fallback to empty emails on error
      setEmails([])
    } finally {
      setLoadingEmails(false)
      setLoading(false) // Clear main loading state
    }
  }, [user?.id, gmailConnected, gmailLabels, currentFolder])

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
    
    // Extract email address from the "from" field
    const emailMatch = email.from.match(/<(.+?)>/) || email.from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    const emailAddress = emailMatch ? emailMatch[1] || emailMatch[0] : email.from
    
    // Extract name from the "from" field (remove email part)
    const nameMatch = email.from.match(/^([^<]+)/)
    const displayName = nameMatch ? nameMatch[1].trim() : emailAddress.split('@')[0]
    
    // Generate dynamic contact info from email
    const contact: Contact = {
      name: displayName,
      email: emailAddress,
      phone: 'Not provided',
      stage: 'New Lead',
      agent: 'Unassigned',
      lender: 'Not assigned',
      recentConversations: [email.subject],
      lastUpdated: email.lastUpdated || new Date().toISOString()
    }
    setSelectedContact(contact)
  }

  const processEmailAsLead = async () => {
    if (!selectedEmail || !user?.id) return
    
    setProcessingEmail(true)
    try {
      // Use AI-powered lead detection first
      const { LeadDetectionService } = await import('@/lib/leadDetection')
      const leadResult = await LeadDetectionService.extractLeadData({
        from: selectedEmail.from,
        subject: selectedEmail.subject,
        body: selectedEmail.body,
        to: selectedEmail.to,
        date: selectedEmail.lastUpdated
      })

      if (leadResult.success && leadResult.lead_data) {
        // Create person from detected lead data
        const { EmailLeadProcessor } = await import('@/lib/emailProcessor')
        const person = await EmailLeadProcessor.createPersonFromLeadData(leadResult.lead_data)
        
        if (person) {
          // Mark email as processed
          setEmails(emails.map(email => 
            email.id === selectedEmail.id 
              ? { ...email, isRead: true }
              : email
          ))
          
          // Show success message with detection details
          const confidence = (leadResult.lead_data.confidence_score * 100).toFixed(1)
          const source = leadResult.lead_data.lead_source
          const reasons = leadResult.analysis_result?.reasons.join(', ') || 'AI analysis'
          
          toast.success('Lead Imported Successfully', {
            description: `${selectedEmail.from} has been added as a new lead from ${source} (${confidence}% confidence). ${reasons}`,
            duration: 6000,
          })
        } else {
          throw new Error('Failed to create lead record')
        }
      } else {
        // Fallback to manual processing if AI detection fails
        const response = await fetch('/api/gmail/process-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            maxResults: 1, // Process just this one email
            emailId: selectedEmail.id // Pass the specific email ID
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process email as lead')
        }

        if (data.success) {
          // Mark email as processed
          setEmails(emails.map(email => 
            email.id === selectedEmail.id 
              ? { ...email, isRead: true }
              : email
          ))
          
          // Show success message
          toast.success('Lead Imported Successfully', {
            description: `${selectedEmail.from} has been added as a new lead and assigned to an agent via Round Robin.`,
            duration: 5000,
          })
        } else {
          throw new Error(data.message || 'Failed to process email')
        }
      }
      
    } catch (error) {
      console.error('Error processing email as lead:', error)
      toast.error('Failed to Import Lead', {
        description: error instanceof Error ? error.message : 'There was an error processing this email. Please try again.',
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
    
    // Extract email address from the "from" field
    const emailMatch = selectedEmail.from.match(/<(.+?)>/) || selectedEmail.from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    const emailAddress = emailMatch ? emailMatch[1] || emailMatch[0] : selectedEmail.from
    
    setComposeData({
      to: emailAddress,
      cc: '',
      bcc: '',
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n> ${selectedEmail.body.split('\n').join('\n> ')}`
    })
    setComposeMode('reply')
    setShowComposeModal(true)
  }

  const handleReplyAll = () => {
    if (!selectedEmail) return
    
    // Extract email address from the "from" field
    const emailMatch = selectedEmail.from.match(/<(.+?)>/) || selectedEmail.from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    const emailAddress = emailMatch ? emailMatch[1] || emailMatch[0] : selectedEmail.from
    
    // For reply all, include original recipients
    const originalRecipients = selectedEmail.to !== 'me' ? selectedEmail.to : ''
    
    setComposeData({
      to: emailAddress,
      cc: originalRecipients,
      bcc: '',
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\nOn ${selectedEmail.date}, ${selectedEmail.from} wrote:\n> ${selectedEmail.body.split('\n').join('\n> ')}`
    })
    setComposeMode('replyAll')
    setShowComposeModal(true)
  }

  const handleForward = () => {
    if (!selectedEmail) return
    
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: `Fwd: ${selectedEmail.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`
    })
    setComposeMode('forward')
    setShowComposeModal(true)
  }

  const getLabelIcon = (labelId: string, labelName: string) => {
    // Map Gmail label IDs to appropriate icons
    const iconMap: Record<string, any> = {
      'INBOX': Mail,
      'SENT': Mail,
      'DRAFT': FileText,
      'SPAM': AlertTriangle,
      'TRASH': Trash2,
      'IMPORTANT': Star,
      'STARRED': Star,
      'UNREAD': Circle,
      'CATEGORY_PERSONAL': User,
      'CATEGORY_SOCIAL': Users,
      'CATEGORY_PROMOTIONS': Tag,
      'CATEGORY_UPDATES': Bell,
      'CATEGORY_FORUMS': MessageSquare,
    }

    // Check for exact match first
    if (iconMap[labelId]) {
      return iconMap[labelId]
    }

    // Check for partial matches in label name
    const nameLower = labelName.toLowerCase()
    if (nameLower.includes('draft')) return FileText
    if (nameLower.includes('sent')) return Mail
    if (nameLower.includes('trash')) return Trash2
    if (nameLower.includes('spam')) return AlertTriangle
    if (nameLower.includes('star')) return Star
    if (nameLower.includes('important')) return Star
    if (nameLower.includes('personal')) return User
    if (nameLower.includes('social')) return Users
    if (nameLower.includes('promotion')) return Tag
    if (nameLower.includes('update')) return Bell
    if (nameLower.includes('forum')) return MessageSquare

    // Default icon
    return Mail
  }

  const handleFolderChange = async (folderId: string) => {
    setCurrentFolder(folderId)
    setLoading(true)
    
    if (gmailConnected) {
      // For Gmail labels, load emails for the specific label
      try {
        const response = await fetch('/api/gmail/fetch-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            maxResults: 100, // Increased from 20 to 100
            labelId: folderId
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch emails')
        }

        if (data.success && data.emails) {
          // Transform Gmail API response to our Email interface
          const transformedEmails: Email[] = data.emails.map((gmailEmail: any) => ({
            id: gmailEmail.id,
            from: gmailEmail.from,
            subject: gmailEmail.subject,
            preview: gmailEmail.snippet || gmailEmail.body?.substring(0, 100) || '',
            date: new Date(parseInt(gmailEmail.internalDate)).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            }),
            isRead: gmailEmail.isRead ?? false,
            hasAttachments: gmailEmail.hasAttachments ?? false,
            body: gmailEmail.body || '',
            to: gmailEmail.to || 'me',
            lastUpdated: new Date(parseInt(gmailEmail.internalDate)).toISOString()
          }))

          setEmails(transformedEmails)
          
          // Store the next page token and check if there are more emails to load
          setNextPageToken(data.nextPageToken)
          const currentLabel = gmailLabels.find(label => label.id === folderId)
          const totalEmails = currentLabel?.messagesTotal || 0
          setHasMoreEmails(!!data.nextPageToken || transformedEmails.length < totalEmails)
          
          // Find the label name for the toast message
          const labelName = currentLabel ? currentLabel.name : folderId
          
          toast.success('Emails Loaded', {
            description: `Successfully loaded ${transformedEmails.length} emails from ${labelName}.${totalEmails > transformedEmails.length ? ` ${totalEmails - transformedEmails.length} more available.` : ''}`,
            duration: 3000,
          })
        } else {
          throw new Error(data.message || 'Failed to load emails')
        }
      } catch (error) {
        console.error('Error loading emails for label:', error)
        toast.error('Failed to Load Emails', {
          description: error instanceof Error ? error.message : 'There was an error loading emails for this label.',
          duration: 4000,
        })
        // Fallback to empty emails
        setEmails([])
            } finally {
        setLoading(false)
      }
    }
  }

  // Create dynamic folders based on Gmail labels
  const getFolders = () => {
    if (gmailConnected && gmailLabels.length > 0) {
      // Filter and map Gmail labels to our folder format
      const importantLabels = gmailLabels.filter(label => 
        label.type === 'system' || 
        label.name === 'INBOX' ||
        label.name === 'SENT' ||
        label.name === 'DRAFT' ||
        label.name === 'SPAM' ||
        label.name === 'TRASH' ||
        label.name === 'IMPORTANT' ||
        label.name === 'STARRED' ||
        label.name.startsWith('CATEGORY_')
      )

      // Remove duplicates based on label name
      const uniqueLabels = importantLabels.filter((label, index, self) => 
        index === self.findIndex(l => l.name === label.name)
      )

      console.log('=== Filtered Labels for Display ===')
      uniqueLabels.forEach(label => {
        console.log(`${label.name}: Total=${label.messagesTotal}, Unread=${label.messagesUnread}`)
      })

      return uniqueLabels.map(label => ({
        id: label.id,
        name: label.name === 'INBOX' ? 'Inbox' : 
              label.name === 'SENT' ? 'Sent' :
              label.name === 'DRAFT' ? 'Drafts' :
              label.name === 'SPAM' ? 'Spam' :
              label.name === 'TRASH' ? 'Trash' :
              label.name === 'IMPORTANT' ? 'Important' :
              label.name === 'STARRED' ? 'Starred' :
              label.name.replace('CATEGORY_', '').charAt(0).toUpperCase() + 
              label.name.replace('CATEGORY_', '').slice(1).toLowerCase(),
        count: label.messagesTotal || 0,
        icon: getLabelIcon(label.id, label.name),
        unreadCount: label.messagesUnread || 0
      }))
    } else {
      // Return empty array when Gmail is not connected
      return []
    }
  }

  const folders = getFolders()

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
    <div className=" container flex-1 flex h-[91vh] bg-background overflow-hidden">
      {/* Left Sidebar - Mailbox Navigation */}
      <div className="w-[220px] border-r bg-muted/20 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">
            {gmailConnected && gmailLabels.length > 0 ? (
              (() => {
                const currentLabel = gmailLabels.find(label => label.id === currentFolder)
                return currentLabel ? `${currentLabel.name} (${currentLabel.messagesTotal || 0})` : 'My Inbox'
              })()
            ) : (
              'Gmail Inbox'
            )}
          </h2>
          
          {/* Gmail Connection Status */}
          <div className="mb-4 p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gmail Integration</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${gmailConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {gmailConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
                        {gmailConnected ? (
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={loadGmailEmails}
                  disabled={loadingEmails}
                  className="w-full"
                >
                  {loadingEmails ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                  ) : (
                    <Mail className="h-3 w-3 mr-1" />
                  )}
                  {loadingEmails ? 'Loading...' : 'Load Gmail Emails'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={loadGmailLabels}
                  disabled={loadingLabels}
                  className="w-full"
                >
                  {loadingLabels ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  {loadingLabels ? 'Loading...' : 'Refresh Labels'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowDisconnectModal(true)}
                  className="w-full"
                >
                  <X className="h-3 w-3 mr-1" />
                  Disconnect Gmail
                </Button>
              </div>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={connectGmail}
                className="w-full mt-2"
              >
                <Mail className="h-3 w-3 mr-1" />
                Connect Gmail
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {gmailConnected 
                ? 'Your Gmail account is connected and ready to use'
                : 'Connect your Gmail account to import emails and leads'
              }
            </p>
          </div>
          
          {gmailConnected && folders.length > 0 && (
            <nav className="space-y-1 max-h-[283px] overflow-y-auto pr-2">
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
                      <span className="flex-1 text-left">{folder.name}</span>
                    </div>
                  </button>
                )
              })}
            </nav>
          )}
          
          {!gmailConnected && (
            <div className="mt-4 p-3 bg-muted/20 rounded-lg">
              <div className="text-center">
                <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  Connect your Gmail to see your folders and labels
                </p>
              </div>
            </div>
          )}
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
          {!gmailConnected ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center max-w-md">
                <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Gmail</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  To view and manage your emails, please connect your Gmail account first.
                </p>
                <Button onClick={connectGmail} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Gmail Account
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Your emails will be securely imported and you can process them as leads directly from your inbox.
                </p>
              </div>
            </div>
          ) : filteredEmails.length === 0 ? (
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
          
          {/* Load More Button */}
          {gmailConnected && hasMoreEmails && (
            <div className="p-4 border-t">
              <Button 
                onClick={loadMoreEmails}
                disabled={loadingMore}
                variant="outline"
                className="w-full"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                    Loading more emails...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-2" />
                    Load More Emails
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Email Content */}
      {gmailConnected && selectedEmail && (
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
              <p className="whitespace-pre-wrap text-sm leading-relaxed break-words overflow-wrap-anywhere max-w-full">{selectedEmail.body}</p>
              
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
      {gmailConnected && selectedContact && (
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
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm break-all">{selectedContact.email}</span>
            </div>
            {selectedContact.phone !== 'Not provided' && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedContact.phone}</span>
              </div>
            )}
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
                {selectedContact.recentConversations.length > 0 ? (
                  selectedContact.recentConversations.map((conversation, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{conversation}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent conversations</p>
                )}
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

      {/* Disconnect Gmail Confirmation Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Gmail Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Gmail account? This will remove access to your emails and you will need to reconnect to use Gmail features again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDisconnectModal(false)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={disconnectGmail}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Disconnecting...
                </>
              ) : (
                'Disconnect Gmail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose Email Modal */}
      <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {composeMode === 'reply' && 'Reply to Email'}
              {composeMode === 'replyAll' && 'Reply All'}
              {composeMode === 'forward' && 'Forward Email'}
            </DialogTitle>
            <DialogDescription>
              {composeMode === 'reply' && `Reply to ${selectedEmail?.from}`}
              {composeMode === 'replyAll' && `Reply to all recipients of "${selectedEmail?.subject}"`}
              {composeMode === 'forward' && `Forward "${selectedEmail?.subject}" from ${selectedEmail?.from}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cc">CC</Label>
                  <Input
                    id="cc"
                    value={composeData.cc}
                    onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                    placeholder="cc@example.com (optional)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bcc">BCC</Label>
                  <Input
                    id="bcc"
                    value={composeData.bcc}
                    onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                    placeholder="bcc@example.com (optional)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>
                
                <div>
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Type your message here..."
                    rows={6}
                    className="resize-none"
                    autoFocus
                    onFocus={(e) => {
                      // Position cursor at the beginning of the textarea
                      e.target.setSelectionRange(0, 0)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowComposeModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  // Validate required fields
                  if (!composeData.to || !composeData.subject || !composeData.body) {
                    toast.error('Missing Required Fields', {
                      description: 'Please fill in all required fields (To, Subject, and Message).',
                      duration: 4000,
                    })
                    return
                  }

                  setSendingEmail(true)

                  // Send email via API
                  const response = await fetch('/api/gmail/send-email', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      userId: user?.id,
                      to: composeData.to,
                      cc: composeData.cc || undefined,
                      bcc: composeData.bcc || undefined,
                      subject: composeData.subject,
                      body: composeData.body
                    })
                  })

                  const data = await response.json()

                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to send email')
                  }

                  if (data.success) {
                    toast.success('Email Sent Successfully', {
                      description: `Your ${composeMode} email has been sent via Gmail.`,
                      duration: 4000,
                    })
                    setShowComposeModal(false)
                    // Reset compose data
                    setComposeData({
                      to: '',
                      cc: '',
                      bcc: '',
                      subject: '',
                      body: ''
                    })
                  } else {
                    throw new Error(data.error || 'Failed to send email')
                  }
                } catch (error) {
                  console.error('Error sending email:', error)
                  toast.error('Failed to Send Email', {
                    description: error instanceof Error ? error.message : 'There was an error sending your email. Please try again.',
                    duration: 6000,
                  })
                } finally {
                  setSendingEmail(false)
                }
              }}
              disabled={sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 