'use client'

import { useState, useEffect } from 'react'
import { Mail, Home, RefreshCw, Settings, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function IntegrationsPage() {
  const [gmailConfig, setGmailConfig] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    emailAddress: '',
    enabled: false
  })
  
  const [homeStackConfig, setHomeStackConfig] = useState({
    apiKey: '',
    baseUrl: '',
    webhookSecret: '',
    enabled: false
  })
  
  const [processing, setProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState<{
    gmail?: { count: number; timestamp: string }
    homeStack?: { count: number; timestamp: string }
  }>({})
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Load saved configurations
    loadConfigurations()
  }, [])

  const loadConfigurations = async () => {
    try {
      // In a real app, you'd load these from your database
      // For now, we'll use localStorage or environment variables
      const savedGmail = localStorage.getItem('gmailConfig')
      const savedHomeStack = localStorage.getItem('homeStackConfig')
      
      if (savedGmail) {
        setGmailConfig(JSON.parse(savedGmail))
      }
      if (savedHomeStack) {
        setHomeStackConfig(JSON.parse(savedHomeStack))
      }
    } catch {
      console.error('Error loading configurations:')
    }
  }

  const saveGmailConfig = async () => {
    try {
      setProcessing(true)
      setError('')
      
      // Save to localStorage (in production, save to database)
      localStorage.setItem('gmailConfig', JSON.stringify(gmailConfig))
      
      setSuccess('Gmail configuration saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to save Gmail configuration')
    } finally {
      setProcessing(false)
    }
  }

  const saveHomeStackConfig = async () => {
    try {
      setProcessing(true)
      setError('')
      
      // Save to localStorage (in production, save to database)
      localStorage.setItem('homeStackConfig', JSON.stringify(homeStackConfig))
      
      setSuccess('HomeStack configuration saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to save HomeStack configuration')
    } finally {
      setProcessing(false)
    }
  }

  const processGmailLeads = async () => {
    try {
      setProcessing(true)
      setError('')
      
      const response = await fetch('/api/gmail/process-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 20 })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastProcessed(prev => ({
          ...prev,
          gmail: { count: result.processedCount, timestamp: new Date().toISOString() }
        }))
        setSuccess(`Processed ${result.processedCount} leads from Gmail`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.error || 'Failed to process Gmail leads')
      }
    } catch {
      setError('Failed to process Gmail leads')
    } finally {
      setProcessing(false)
    }
  }

  const processHomeStackLeads = async () => {
    try {
      setProcessing(true)
      setError('')
      
      const response = await fetch('/api/homestack/process-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastProcessed(prev => ({
          ...prev,
          homeStack: { count: result.processedCount, timestamp: new Date().toISOString() }
        }))
        setSuccess(`Processed ${result.processedCount} leads from HomeStack`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.error || 'Failed to process HomeStack leads')
      }
    } catch {
      setError('Failed to process HomeStack leads')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Lead Integrations</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="gmail" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gmail Integration
          </TabsTrigger>
          <TabsTrigger value="homestack" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            HomeStack Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gmail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Gmail Lead Processing
              </CardTitle>
              <CardDescription>
                Automatically capture leads from Gmail emails. This integration monitors your inbox
                for lead notification emails from real estate portals and creates contacts automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="gmail-enabled"
                  checked={gmailConfig.enabled}
                  onCheckedChange={(checked) => 
                    setGmailConfig(prev => ({ ...prev, enabled: checked }))
                  }
                />
                <Label htmlFor="gmail-enabled">Enable Gmail Integration</Label>
              </div>

              {gmailConfig.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gmail-client-id">Client ID</Label>
                      <Input
                        id="gmail-client-id"
                        type="password"
                        value={gmailConfig.clientId}
                        onChange={(e) => 
                          setGmailConfig(prev => ({ ...prev, clientId: e.target.value }))
                        }
                        placeholder="Gmail OAuth Client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmail-client-secret">Client Secret</Label>
                      <Input
                        id="gmail-client-secret"
                        type="password"
                        value={gmailConfig.clientSecret}
                        onChange={(e) => 
                          setGmailConfig(prev => ({ ...prev, clientSecret: e.target.value }))
                        }
                        placeholder="Gmail OAuth Client Secret"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmail-refresh-token">Refresh Token</Label>
                    <Input
                      id="gmail-refresh-token"
                      type="password"
                      value={gmailConfig.refreshToken}
                      onChange={(e) => 
                        setGmailConfig(prev => ({ ...prev, refreshToken: e.target.value }))
                      }
                      placeholder="Gmail OAuth Refresh Token"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmail-email">Email Address</Label>
                    <Input
                      id="gmail-email"
                      type="email"
                      value={gmailConfig.emailAddress}
                      onChange={(e) => 
                        setGmailConfig(prev => ({ ...prev, emailAddress: e.target.value }))
                      }
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveGmailConfig} disabled={processing}>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                    <Button onClick={processGmailLeads} disabled={processing}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Process Recent Emails
                    </Button>
                  </div>

                  {lastProcessed.gmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        Last processed: {lastProcessed.gmail.count} leads
                      </Badge>
                      <span>
                        {new Date(lastProcessed.gmail.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homestack" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                HomeStack Integration
              </CardTitle>
              <CardDescription>
                Connect to HomeStack API to automatically import leads from your HomeStack app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="homestack-enabled"
                  checked={homeStackConfig.enabled}
                  onCheckedChange={(checked) => 
                    setHomeStackConfig(prev => ({ ...prev, enabled: checked }))
                  }
                />
                <Label htmlFor="homestack-enabled">Enable HomeStack Integration</Label>
              </div>

              {homeStackConfig.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="homestack-api-key">API Key</Label>
                    <Input
                      id="homestack-api-key"
                      type="password"
                      value={homeStackConfig.apiKey}
                      onChange={(e) => 
                        setHomeStackConfig(prev => ({ ...prev, apiKey: e.target.value }))
                      }
                      placeholder="HomeStack API Key"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homestack-base-url">Base URL</Label>
                    <Input
                      id="homestack-base-url"
                      value={homeStackConfig.baseUrl}
                      onChange={(e) => 
                        setHomeStackConfig(prev => ({ ...prev, baseUrl: e.target.value }))
                      }
                      placeholder="https://api.homestack.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homestack-webhook-secret">Webhook Secret (Optional)</Label>
                    <Input
                      id="homestack-webhook-secret"
                      type="password"
                      value={homeStackConfig.webhookSecret}
                      onChange={(e) => 
                        setHomeStackConfig(prev => ({ ...prev, webhookSecret: e.target.value }))
                      }
                      placeholder="Webhook secret for verification"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveHomeStackConfig} disabled={processing}>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                    <Button onClick={processHomeStackLeads} disabled={processing}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Import Recent Leads
                    </Button>
                  </div>

                  {lastProcessed.homeStack && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        Last processed: {lastProcessed.homeStack.count} leads
                      </Badge>
                      <span>
                        {new Date(lastProcessed.homeStack.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 