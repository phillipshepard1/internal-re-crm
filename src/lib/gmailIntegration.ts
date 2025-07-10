import { EmailLeadProcessor } from './emailProcessor'

export interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  accessToken?: string
  emailAddress: string
}

export class GmailIntegration {
  private config: GmailConfig
  private accessToken: string | null = null
  
  constructor(config: GmailConfig) {
    this.config = config
    this.accessToken = config.accessToken || null
  }
  
  /**
   * Initialize Gmail API connection
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        await this.refreshAccessToken()
      }
      return true
    } catch (error) {
      console.error('Failed to initialize Gmail integration:', error)
      return false
    }
  }
  
  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`)
    }
    
    const data = await response.json()
    this.accessToken = data.access_token
  }
  
  /**
   * Get recent emails and process them for leads
   */
  async processRecentEmails(maxResults: number = 10): Promise<number> {
    try {
      if (!this.accessToken) {
        await this.refreshAccessToken()
      }
      
      // Get recent emails
      const emails = await this.getRecentEmails(maxResults)
      let processedCount = 0
      
      for (const email of emails) {
        const lead = await EmailLeadProcessor.processEmail(email)
        if (lead) {
          const person = await EmailLeadProcessor.createPersonFromEmail(lead)
          if (person) {
            processedCount++
            console.log(`Processed lead from email: ${person.first_name} ${person.last_name}`)
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
   * Get recent emails from Gmail
   */
  private async getRecentEmails(maxResults: number): Promise<Record<string, unknown>[]> {
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
    const emails: Record<string, unknown>[] = []
    
    for (const message of data.messages || []) {
      const emailData = await this.getEmailDetails(message.id)
      if (emailData) {
        emails.push(emailData)
      }
    }
    
    return emails
  }
  
  /**
   * Get detailed email information
   */
  private async getEmailDetails(messageId: string): Promise<Record<string, unknown> | null> {
    try {
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
      }
    } catch (error) {
      console.error(`Error getting email details for ${messageId}:`, error)
      return null
    }
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
      console.log('Gmail push notifications setup:', data)
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
      
      console.log('Gmail push notifications stopped')
      return true
    } catch (error) {
      console.error('Error stopping push notifications:', error)
      return false
    }
  }
} 