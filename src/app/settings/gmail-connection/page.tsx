'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface GmailStatus {
  connected: boolean
  configured: {
    clientId: boolean
    clientSecret: boolean
  }
  userConnected: boolean
  gmailEmail: string | null
  connectedAt: string | null
  lastUpdated: string | null
  message: string
}

export default function GmailConnectionPage() {
  const { user } = useAuth()
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const checkGmailStatus = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/gmail/status?userId=${user.id}`)
      const data = await response.json()
      setGmailStatus(data)
    } catch (error) {
      console.error('Error checking Gmail status:', error)
      toast.error('Failed to check Gmail status')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      checkGmailStatus()
    }
  }, [user?.id, checkGmailStatus])

  const connectGmail = async () => {
    if (!user?.id) {
      toast.error('User not authenticated')
      return
    }

    setConnecting(true)
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
    } finally {
      setConnecting(false)
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
          revokeAccess: true // Also revoke access with Google
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
        // Refresh the status
        await checkGmailStatus()
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

  const refreshStatus = async () => {
    setLoading(true)
    await checkGmailStatus()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading Gmail status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gmail Integration</h1>
        <p className="text-muted-foreground">
          Connect your Gmail account to import emails and automatically create leads from your inbox.
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {gmailStatus ? (
            <div className="space-y-4">
              {/* System Configuration Status */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${gmailStatus.configured.clientId && gmailStatus.configured.clientSecret ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">System Configuration</span>
                </div>
                <Badge variant={gmailStatus.configured.clientId && gmailStatus.configured.clientSecret ? 'default' : 'destructive'}>
                  {gmailStatus.configured.clientId && gmailStatus.configured.clientSecret ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>

              {/* User Connection Status */}
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${gmailStatus.userConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">Your Gmail Account</span>
                </div>
                <Badge variant={gmailStatus.userConnected ? 'default' : 'secondary'}>
                  {gmailStatus.userConnected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>

              {/* Connection Details */}
              {gmailStatus.userConnected && gmailStatus.gmailEmail && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Connected Successfully</span>
                  </div>
                  <p className="text-sm text-green-700 mb-2">
                    Email: <span className="font-mono">{gmailStatus.gmailEmail}</span>
                  </p>
                  {gmailStatus.connectedAt && (
                    <p className="text-xs text-green-600">
                      Connected: {new Date(gmailStatus.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Error Messages */}
              {!gmailStatus.configured.clientId || !gmailStatus.configured.clientSecret ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Gmail OAuth client credentials are not configured. Please contact your administrator to set up the Gmail integration.
                  </AlertDescription>
                </Alert>
              ) : !gmailStatus.userConnected ? (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Your Gmail account is not connected. Click the button below to connect your Gmail account and start importing emails.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Failed to load Gmail status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {gmailStatus?.userConnected ? (
          <>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/inbox'}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              Go to Inbox
            </Button>
            <Button
              variant="outline"
              onClick={disconnectGmail}
              disabled={disconnecting}
              className="flex-1"
            >
              {disconnecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Disconnect Gmail
            </Button>
          </>
        ) : (
          <Button
            onClick={connectGmail}
            disabled={connecting || !gmailStatus?.configured.clientId || !gmailStatus?.configured.clientSecret}
            className="flex-1"
          >
            {connecting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {connecting ? 'Connecting...' : 'Connect Gmail Account'}
          </Button>
        )}
      </div>

      {/* Information */}
      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Connect your Gmail account</p>
                <p className="text-sm text-muted-foreground">
                  Authorize the application to access your Gmail account securely through Google OAuth.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium">Import your emails</p>
                <p className="text-sm text-muted-foreground">
                  Load emails from your Gmail inbox and view them in the CRM inbox interface.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium">Create leads automatically</p>
                <p className="text-sm text-muted-foreground">
                  Process emails as leads and automatically assign them to agents using round-robin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Your Gmail credentials are never stored - only OAuth tokens are used</li>
              <li>• Access is limited to reading emails and basic profile information</li>
              <li>• You can revoke access at any time through your Google Account settings</li>
              <li>• All data is encrypted and stored securely</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 