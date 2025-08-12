'use client'

import { useState, useEffect, useCallback } from 'react'
import { Home, RefreshCw, Settings, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function IntegrationsPage() {
  const [homeStackConfig, setHomeStackConfig] = useState({
    apiKey: '',
    baseUrl: '',
    webhookSecret: '',
    enabled: false,
    // SSO configuration
    ssoEnabled: false,
    ssoApiKey: '',
    ssoBaseUrl: 'https://bkapi.homestack.com',
    ssoBrokerUrl: 'https://broker.homestack.com'
  })
  
  const [processing, setProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState<{
    homeStack?: { count: number; timestamp: string }
  }>({})
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadConfigurations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/integrations/homestack')
      if (response.ok) {
        const data = await response.json()
        // Extract the config from the response
        if (data.config) {
          setHomeStackConfig({
            apiKey: data.config.api_key || '',
            baseUrl: data.config.base_url || '',
            webhookSecret: data.config.webhook_secret || '',
            enabled: data.config.enabled || false,
            ssoEnabled: data.config.sso_enabled || false,
            ssoApiKey: data.config.sso_api_key || '',
            ssoBaseUrl: data.config.sso_base_url || 'https://bkapi.homestack.com',
            ssoBrokerUrl: data.config.sso_broker_url || 'https://broker.homestack.com'
          })
        }
      }
    } catch (error) {
      // Error loading configurations
    }
  }, [])

  useEffect(() => {
    // Load saved configurations
    loadConfigurations()
  }, [loadConfigurations])

  const saveHomeStackConfig = async () => {
    try {
      setProcessing(true)
      setError('')
      
      // Save to database via API
      const response = await fetch('/api/admin/integrations/homestack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(homeStackConfig)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setSuccess('HomeStack configuration saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.error || 'Failed to save HomeStack configuration')
      }
    } catch (error) {
      setError('Failed to save HomeStack configuration')
    } finally {
      setProcessing(false)
    }
  }

  const testHomeStackWebhook = async () => {
    try {
      setProcessing(true)
      setError('')
      
      const response = await fetch('/api/homestack/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventType: 'user.created',
          testData: {
            id: `test_user_${Date.now()}`,
            email: `testuser${Date.now()}@example.com`,
            first_name: 'Test',
            last_name: 'User',
            phone: '+1234567890',
            created_at: new Date().toISOString()
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(`Test webhook successful! Created user: ${result.test_data.email} (ID: ${result.person_id})`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.error || 'Failed to test webhook')
      }
    } catch (error) {
      setError('Failed to test webhook')
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

      <Tabs defaultValue="homestack" className="space-y-4">
        <TabsList>
          <TabsTrigger value="homestack" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            HomeStack Integration
          </TabsTrigger>
        </TabsList>



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
              
              {/* Webhook Configuration Section */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h4 className="text-sm font-medium mb-3">Webhook Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Webhook URL for HomeStack:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={`${window.location.origin}/api/webhooks/homestack`}
                        readOnly
                        className="text-sm font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/homestack`);
                          setSuccess('Webhook URL copied to clipboard!');
                          setTimeout(() => setSuccess(''), 3000);
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  

                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="homestack-enabled"
                  checked={homeStackConfig.enabled || false}
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

                  {/* SSO Configuration Section */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <h4 className="text-sm font-medium mb-3">SSO Configuration</h4>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="homestack-sso-enabled"
                          checked={homeStackConfig.ssoEnabled || false}
                          onCheckedChange={(checked) => 
                            setHomeStackConfig(prev => ({ ...prev, ssoEnabled: checked }))
                          }
                        />
                        <Label htmlFor="homestack-sso-enabled">Enable HomeStack SSO</Label>
                      </div>

                      {homeStackConfig.ssoEnabled && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="homestack-sso-api-key">SSO API Key</Label>
                            <Input
                              id="homestack-sso-api-key"
                              type="password"
                              value={homeStackConfig.ssoApiKey}
                              onChange={(e) => 
                                setHomeStackConfig(prev => ({ ...prev, ssoApiKey: e.target.value }))
                              }
                              placeholder="HomeStack SSO API Key"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="homestack-sso-base-url">SSO Base URL</Label>
                            <Input
                              id="homestack-sso-base-url"
                              value={homeStackConfig.ssoBaseUrl}
                              onChange={(e) => 
                                setHomeStackConfig(prev => ({ ...prev, ssoBaseUrl: e.target.value }))
                              }
                              placeholder="https://bkapi.homestack.com"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="homestack-sso-broker-url">SSO Broker URL</Label>
                            <Input
                              id="homestack-sso-broker-url"
                              value={homeStackConfig.ssoBrokerUrl}
                              onChange={(e) => 
                                setHomeStackConfig(prev => ({ ...prev, ssoBrokerUrl: e.target.value }))
                              }
                              placeholder="https://broker.homestack.com"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={saveHomeStackConfig} disabled={processing}>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Configuration
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