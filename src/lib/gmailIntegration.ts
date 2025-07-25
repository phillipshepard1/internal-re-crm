import { EmailLeadProcessor } from './emailProcessor'
import { LeadDetectionService } from './leadDetection'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  emailAddress: string
}

export interface UserGmailToken {
  id: string
  user_id: string
  access_token: string | null
  refresh_token: string
  token_type: string
  expires_at: string | null
  scope: string | null
  gmail_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export class GmailIntegration {
  private config: GmailConfig
  private accessToken: string | null = null
  private userId: string
  
  constructor(config: GmailConfig, userId: string) {
    this.config = config
    this.accessToken = config.accessToken || null
    this.userId = userId
  }
  
  /**
   * Get user's Gmail tokens from database
   */
  static async getUserGmailTokens(userId: string): Promise<UserGmailToken | null> {
    try {
      const { data, error } = await supabase
        .from('user_gmail_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting user Gmail tokens:', error)
      return null
    }
  }

  /**
   * Update user's access token in database
   */
  private async updateAccessToken(accessToken: string, expiresAt?: string | null): Promise<void> {
    try {
      await supabase
        .from('user_gmail_tokens')
        .update({
          access_token: accessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('is_active', true)
    } catch (error) {
      console.error('Error updating access token:', error)
    }
  }
  
  /**
   * Initialize Gmail API connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Get user's Gmail tokens
      const userTokens = await GmailIntegration.getUserGmailTokens(this.userId)
      if (!userTokens) {
        throw new Error('No Gmail tokens found for user')
      }

      // Check if access token is expired
      if (userTokens.access_token && userTokens.expires_at) {
        const expiresAt = new Date(userTokens.expires_at)
        if (expiresAt > new Date()) {
          this.accessToken = userTokens.access_token
          return true
        }
      }

      // Refresh the access token
      await this.refreshAccessToken(userTokens.refresh_token || '')
      return true
    } catch (error) {
      console.error('Failed to initialize Gmail integration:', error)
      return false
    }
  }
  
  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    if (!response.ok) {
      // Mark connection as inactive when refresh fails
      try {
        await supabase
          .from('user_gmail_tokens')
          .update({ is_active: false })
          .eq('user_id', this.userId)
          .eq('is_active', true)
      } catch (error) {
        console.error('Error deactivating invalid tokens:', error)
      }
      
      throw new Error(`Failed to refresh token: ${response.statusText}. Gmail connection has been deactivated.`)
    }
    
    const data = await response.json()
    this.accessToken = data.access_token
    
    // Update the access token in database
    const expiresAt = data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null
    await this.updateAccessToken(data.access_token, expiresAt)
  }
  
  /**
   * Get recent emails and process them for leads
   */
  async processRecentEmails(maxResults: number = 10): Promise<number> {
    try {
      if (!this.accessToken) {
        await this.initialize()
      }
      
      // Get recent emails
      const emails = await this.getRecentEmails(maxResults)
      let processedCount = 0
      
      for (const email of emails) {
        // Use AI-powered lead detection
        const leadResult = await LeadDetectionService.extractLeadData({
          from: email.from as string,
          subject: email.subject as string,
          body: email.body as string,
          to: email.to as string,
          date: email.internalDate as string
        })
        
        if (leadResult.success && leadResult.lead_data) {
          // Create person from detected lead data
          const person = await EmailLeadProcessor.createPersonFromLeadData(leadResult.lead_data)
          if (person) {
            processedCount++
            console.log(`Processed lead: ${leadResult.lead_data.first_name} ${leadResult.lead_data.last_name} (${leadResult.lead_data.lead_source}) - Confidence: ${(leadResult.lead_data.confidence_score * 100).toFixed(1)}%`)
          }
        }
      }
      
      return processedCount
    } catch (error) {
      console.error('Error processing recent emails:', error)
      return 0
    }
  }
  
  /**
   * Get recent emails from Gmail with optimized batch processing
   */
  public async getRecentEmails(maxResults: number): Promise<Record<string, unknown>[]> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    // First, get the list of message IDs
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to get emails: ${response.statusText}`)
    }
    
    const data = await response.json()
    const messageIds = data.messages?.map((msg: any) => msg.id) || []
    
    if (messageIds.length === 0) {
      return []
    }

    // Use batch request to get multiple email details at once
    const emails = await this.getEmailDetailsBatch(messageIds)
    return emails
  }

  /**
   * Get emails by label from Gmail with optimized batch processing
   */
  public async getEmailsByLabel(labelId: string, maxResults: number, pageToken?: string): Promise<{ emails: Record<string, unknown>[], nextPageToken?: string }> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=${maxResults}`
    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get emails for label ${labelId}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const messageIds = data.messages?.map((msg: any) => msg.id) || []
    
    if (messageIds.length === 0) {
      return { emails: [], nextPageToken: data.nextPageToken }
    }

    // Use batch request to get multiple email details at once
    const emails = await this.getEmailDetailsBatch(messageIds)
    
    return {
      emails,
      nextPageToken: data.nextPageToken
    }
  }

  /**
   * Get Gmail labels (folders) with email counts
   */
  public async getLabels(): Promise<Array<{
    id: string
    name: string
    type: string
    messageListVisibility?: string
    labelListVisibility?: string
    messagesTotal?: number
    messagesUnread?: number
    threadsTotal?: number
    threadsUnread?: number
  }>> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to get labels: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Filter and map labels to our format, using the accurate counts from Gmail API
    const labels = (data.labels || []).map((label: any) => ({
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility,
      messagesTotal: parseInt(label.messagesTotal) || 0,
      messagesUnread: parseInt(label.messagesUnread) || 0,
      threadsTotal: parseInt(label.threadsTotal) || 0,
      threadsUnread: parseInt(label.threadsUnread) || 0,
    }))

    // Log the counts from Gmail API for debugging
    console.log('Gmail API label counts:')
    labels.forEach((label: { name: any; messagesTotal: any; messagesUnread: any }) => {
      console.log(`${label.name}: Total=${label.messagesTotal}, Unread=${label.messagesUnread}`)
    })

    return labels
  }
  
  /**
   * Get detailed email information
   */
  private async getEmailDetails(messageId: string): Promise<Record<string, unknown> | null> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )
      
      if (!response.ok) {
        return null
      }
      
      const data = await response.json()
      
      // Extract email details from Gmail API response
      const headers = data.payload?.headers || []
      const subject = headers.find((h: Record<string, unknown>) => h.name === 'Subject')?.value || ''
      const from = headers.find((h: Record<string, unknown>) => h.name === 'From')?.value || ''
      const to = headers.find((h: Record<string, unknown>) => h.name === 'To')?.value || ''
      
      // Check if email is read (has UNREAD label)
      const isRead = !data.labelIds?.includes('UNREAD')
      
      // Check for attachments
      const hasAttachments = this.hasAttachments(data.payload)
      
      // Get email body
      const body = this.extractEmailBody(data.payload)
      
      return {
        id: messageId,
        subject,
        from,
        to,
        body,
        snippet: data.snippet,
        internalDate: data.internalDate,
        isRead,
        hasAttachments,
      }
    } catch (error) {
      console.error(`Error getting email details for ${messageId}:`, error)
      return null
    }
  }

  /**
   * Get email details in batch to reduce API calls
   */
  private async getEmailDetailsBatch(messageIds: string[]): Promise<Record<string, unknown>[]> {
    const emails: Record<string, unknown>[] = []
    
    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize)
      
      // Use Promise.all for concurrent requests within the batch
      const batchPromises = batch.map(async (messageId) => {
        try {
          return await this.getEmailDetails(messageId)
        } catch (error) {
          console.error(`Error getting email details for ${messageId}:`, error)
          return null
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      emails.push(...(batchResults.filter((r): r is Record<string, unknown> => !!r)))
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return emails
  }
  
  /**
   * Check if email has attachments
   */
  private hasAttachments(payload: Record<string, unknown> | null): boolean {
    if (!payload) return false
    
    // Check if message has parts (multipart)
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts as Record<string, unknown>[]) {
        // Check if part is an attachment
        if (part.filename && part.filename !== '') {
          return true
        }
        // Check if part has sub-parts with attachments
        if (part.parts && Array.isArray(part.parts)) {
          for (const subPart of part.parts as Record<string, unknown>[]) {
            if (subPart.filename && subPart.filename !== '') {
              return true
            }
          }
        }
      }
    }
    
    // Check if single part message has attachment
    if (payload.filename && payload.filename !== '') {
      return true
    }
    
    return false
  }

  /**
   * Extract email body from Gmail API response
   */
  private extractEmailBody(payload: Record<string, unknown> | null): string {
    if (!payload) return ''
    
    // Handle multipart messages
    if (payload.parts && Array.isArray(payload.parts)) {
      for (const part of payload.parts as Record<string, unknown>[]) {
        if (part.mimeType === 'text/plain') {
          const body = part.body as Record<string, unknown> | undefined
          return this.decodeBody((body?.data as string) || '')
        }
        if (part.mimeType === 'text/html') {
          // Fallback to HTML if plain text not available
          const body = part.body as Record<string, unknown> | undefined
          return this.decodeBody((body?.data as string) || '')
        }
      }
    }
    
    // Handle single part messages
    if (payload.body && typeof payload.body === 'object' && 'data' in payload.body) {
      return this.decodeBody((payload.body as Record<string, unknown>).data as string)
    }
    
    return ''
  }
  
  /**
   * Decode base64 encoded email body
   */
  private decodeBody(encodedData: string): string {
    try {
      return Buffer.from(encodedData, 'base64').toString('utf-8')
    } catch (error) {
      console.error('Error decoding email body:', error)
      return ''
    }
  }
  
  /**
   * Set up Gmail push notifications (for real-time processing)
   */
  async setupPushNotifications(topicName: string): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/watch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicName,
            labelIds: ['INBOX'],
          }),
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to setup push notifications: ${response.statusText}`)
      }
      
      const data = await response.json()
      return true
    } catch (error) {
      console.error('Error setting up push notifications:', error)
      return false
    }
  }
  
  /**
   * Stop Gmail push notifications
   */
  async stopPushNotifications(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/stop`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to stop push notifications: ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('Error stopping push notifications:', error)
      return false
    }
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(emailData: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    body: string
  }): Promise<boolean> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available')
      }

      // Create email message in RFC 2822 format
      const message = this.createEmailMessage(emailData)
      
      // Encode the message in base64
      const encodedMessage = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to send email: ${errorData.error?.message || response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  /**
   * Create email message in RFC 2822 format
   */
  private createEmailMessage(emailData: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    body: string
  }): string {
    const { to, cc, bcc, subject, body } = emailData
    
    // Get current date in RFC 2822 format
    const date = new Date().toUTCString()
    
    // Create message ID
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${this.config.emailAddress.split('@')[1]}>`
    
    // Build headers
    let headers = [
      `From: ${this.config.emailAddress}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
    ]

    if (cc) {
      headers.push(`Cc: ${cc}`)
    }
    if (bcc) {
      headers.push(`Bcc: ${bcc}`)
    }

    // Combine headers and body
    return `${headers.join('\r\n')}\r\n\r\n${body}`
  }

  /**
   * Revoke Gmail access token with Google
   */
  async revokeAccess(): Promise<boolean> {
    try {
      // Get current tokens
      const userTokens = await GmailIntegration.getUserGmailTokens(this.userId)
      if (!userTokens) {
        return false
      }

      // Revoke the refresh token with Google
      const revokeResponse = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: userTokens.refresh_token || userTokens.access_token || '',
        }),
      })

      return revokeResponse.ok
    } catch (error) {
      console.error('Error revoking Gmail access:', error)
      return false
    }
  }
} 