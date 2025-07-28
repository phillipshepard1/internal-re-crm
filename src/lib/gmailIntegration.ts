import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken: string
  emailAddress: string
}

interface EmailData {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
  attachments?: Array<{
    filename: string
    mimeType: string
    data: string // base64
  }>
}

export class GmailIntegration {
  private config: GmailConfig
  private userId: string
  private gmail: any
  
  constructor(config: GmailConfig, userId: string) {
    this.config = config
    this.userId = userId
  }
  
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Gmail integration for user:', this.userId)
      
      // Check if already initialized
      if (this.gmail) {
        console.log('Gmail already initialized, skipping...')
          return true
      }

      console.log('Config check:', {
        hasClientId: !!this.config.clientId,
        hasClientSecret: !!this.config.clientSecret,
        hasAccessToken: !!this.config.accessToken,
        hasRefreshToken: !!this.config.refreshToken,
        emailAddress: this.config.emailAddress
      })

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      )
      console.log('OAuth2 client created')

      oauth2Client.setCredentials({
        access_token: this.config.accessToken,
        refresh_token: this.config.refreshToken
      })
      console.log('OAuth2 credentials set')

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      console.log('Gmail API client created')
      
      return true
    } catch (error) {
      console.error('Error initializing Gmail integration:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          hasClientId: !!this.config.clientId,
          hasClientSecret: !!this.config.clientSecret,
          hasAccessToken: !!this.config.accessToken,
          hasRefreshToken: !!this.config.refreshToken
        }
      })
      return false
    }
  }
  
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      // Create email message
      const message = {
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        text: emailData.body,
        attachments: emailData.attachments || []
      }

      // Build email headers
      let headers = `To: ${message.to}\r\n`
      if (message.cc) {
        headers += `Cc: ${message.cc}\r\n`
      }
      if (message.bcc) {
        headers += `Bcc: ${message.bcc}\r\n`
      }
      headers += `Subject: ${message.subject}\r\n`
      headers += `Content-Type: text/plain; charset=utf-8\r\n`
      headers += `\r\n`
      headers += `${message.text}`

      // Encode the message
      const encodedMessage = Buffer.from(headers).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      // Send the email
      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      })

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  async fetchEmails(maxResults: number = 10, labelIds?: string[]): Promise<any[]> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: labelIds || ['INBOX'],
        q: 'is:unread'
      })

      if (!response.data.messages) {
        return []
      }

      // Fetch emails in parallel for better performance
      const emailPromises = response.data.messages.map((msg: any) =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
      )

      const emailResponses = await Promise.all(emailPromises)
      return emailResponses.map(response => response.data)
    } catch (error) {
      console.error('Error fetching emails:', error)
      return []
    }
  }

  async getRecentEmails(maxResults: number = 20): Promise<any[]> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      console.log('Getting recent emails, maxResults:', maxResults)

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: ['INBOX']
      })

      console.log('Recent messages list response:', {
        messagesCount: response.data.messages?.length || 0,
        hasMessages: !!response.data.messages
      })

      if (!response.data.messages) {
        console.log('No recent messages found')
        return []
      }

      // Fetch emails in parallel for better performance
      console.log('Fetching', response.data.messages.length, 'recent emails in parallel')
      const emailPromises = response.data.messages.map((msg: any) =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
      )

      const emailResponses = await Promise.all(emailPromises)
      const emails = emailResponses.map(response => response.data)
      
      console.log('Successfully fetched', emails.length, 'recent emails')

      return emails
    } catch (error) {
      console.error('Error fetching recent emails:', error)
      return []
    }
  }

  async getEmailsByLabel(labelId: string, maxResults: number = 20, pageToken?: string): Promise<{ emails: any[], nextPageToken?: string }> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      console.log('Getting emails for label:', labelId, 'maxResults:', maxResults, 'pageToken:', pageToken)

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds: [labelId],
        pageToken
      })

      console.log('Messages list response:', {
        messagesCount: response.data.messages?.length || 0,
        nextPageToken: response.data.nextPageToken,
        hasMessages: !!response.data.messages
      })

      if (!response.data.messages) {
        console.log('No messages found for label:', labelId)
        return { emails: [] }
      }

      // Fetch emails in parallel for better performance
      console.log('Fetching', response.data.messages.length, 'emails in parallel')
      const emailPromises = response.data.messages.map((msg: any) =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        })
      )

      const emailResponses = await Promise.all(emailPromises)
      const emails = emailResponses.map(response => response.data)
      
      console.log('Successfully fetched', emails.length, 'emails for label:', labelId)

      return {
        emails,
        nextPageToken: response.data.nextPageToken
      }
    } catch (error) {
      console.error('Error fetching emails by label:', error)
      return { emails: [] }
    }
  }

  async getLabels(): Promise<any[]> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      console.log('Fetching Gmail labels...')
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      })

      console.log('Labels response received:', response.data.labels?.length || 0, 'labels')
      return response.data.labels || []
    } catch (error) {
      console.error('Error fetching labels:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        gmailInitialized: !!this.gmail
      })
      throw error // Re-throw to let the calling code handle it
    }
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer | null> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      })

      if (response.data.data) {
        return Buffer.from(response.data.data, 'base64')
      }

      return null
    } catch (error) {
      console.error('Error downloading attachment:', error)
      return null
    }
  }

  async getEmailMetadata(messageId: string): Promise<any> {
    try {
      if (!this.gmail) {
        throw new Error('Gmail not initialized')
      }

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      return response.data
    } catch (error) {
      console.error('Error getting email metadata:', error)
      return null
    }
  }

  // Static method to get user Gmail tokens
  static async getUserGmailTokens(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_gmail_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching user Gmail tokens:', error)
      return null
    }
  }
} 