'use client'

import { useState, useEffect } from 'react'
import { Mail, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface EmailSettings {
  enabled: boolean
  emailAddress: string
  autoImportLeads: boolean
  leadKeywords: string[]
  excludedDomains: string[]
  notificationEmail: string
}

export default function SettingsPage() {
  const { user, userRole } = useAuth()
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: false,
    emailAddress: '',
    autoImportLeads: true,
    leadKeywords: ['lead', 'inquiry', 'property', 'house', 'home', 'real estate'],
    excludedDomains: ['noreply', 'donotreply', 'mailer-daemon'],
    notificationEmail: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Load saved settings
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // In a real app, load from database
      const saved = localStorage.getItem(`emailSettings_${user?.id}`)
      if (saved) {
        setEmailSettings(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      // In a real app, save to database
      localStorage.setItem(`emailSettings_${user?.id}`, JSON.stringify(emailSettings))
      
      setMessage({
        type: 'success',
        text: 'Email settings saved successfully!'
      })
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save settings. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const testEmailIntegration = async () => {
    setTesting(true)
    setMessage(null)
    
    try {
      // Test the email processing with a sample email
      const response = await fetch('/api/email/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailData: {
            subject: 'Test Lead Inquiry - 123 Main St',
            from: 'test@example.com',
            body: 'Hi, I am interested in the property at 123 Main St. Please contact me at test@example.com or 555-1234.',
            to: emailSettings.emailAddress
          }
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setMessage({
          type: 'success',
          text: 'Email integration test successful! Lead processing is working correctly.'
        })
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Email integration test failed. Please check your settings.'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to test email integration. Please try again.'
      })
    } finally {
      setTesting(false)
    }
  }

  const updateLeadKeywords = (keywords: string) => {
    setEmailSettings(prev => ({
      ...prev,
      leadKeywords: keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    }))
  }

  const updateExcludedDomains = (domains: string) => {
    setEmailSettings(prev => ({
      ...prev,
      excludedDomains: domains.split(',').map(d => d.trim()).filter(d => d.length > 0)
    }))
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Configure your email integration and lead import settings
          </p>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email Integration</TabsTrigger>
          <TabsTrigger value="leads">Lead Import</TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="admin">Admin Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Integration Settings
              </CardTitle>
              <CardDescription>
                Configure your email account for lead import and processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-enabled"
                  checked={emailSettings.enabled}
                  onCheckedChange={(checked) => 
                    setEmailSettings(prev => ({ ...prev, enabled: checked }))
                  }
                />
                <Label htmlFor="email-enabled">Enable Email Integration</Label>
              </div>

              {emailSettings.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Email Address</Label>
                    <Input
                      id="email-address"
                      type="email"
                      value={emailSettings.emailAddress}
                      onChange={(e) => 
                        setEmailSettings(prev => ({ ...prev, emailAddress: e.target.value }))
                      }
                      placeholder="your-email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-email">Notification Email (Optional)</Label>
                    <Input
                      id="notification-email"
                      type="email"
                      value={emailSettings.notificationEmail}
                      onChange={(e) => 
                        setEmailSettings(prev => ({ ...prev, notificationEmail: e.target.value }))
                      }
                      placeholder="notifications@example.com"
                    />
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when leads are imported
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveSettings} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                    <Button variant="outline" onClick={testEmailIntegration} disabled={testing}>
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? 'Testing...' : 'Test Integration'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Import Settings</CardTitle>
              <CardDescription>
                Configure how leads are automatically imported from emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-import"
                  checked={emailSettings.autoImportLeads}
                  onCheckedChange={(checked) => 
                    setEmailSettings(prev => ({ ...prev, autoImportLeads: checked }))
                  }
                />
                <Label htmlFor="auto-import">Automatically Import Leads</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-keywords">Lead Keywords (comma-separated)</Label>
                <Textarea
                  id="lead-keywords"
                  value={emailSettings.leadKeywords.join(', ')}
                  onChange={(e) => updateLeadKeywords(e.target.value)}
                  placeholder="lead, inquiry, property, house, home, real estate"
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Emails containing these keywords will be processed as potential leads
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excluded-domains">Excluded Domains (comma-separated)</Label>
                <Textarea
                  id="excluded-domains"
                  value={emailSettings.excludedDomains.join(', ')}
                  onChange={(e) => updateExcludedDomains(e.target.value)}
                  placeholder="noreply, donotreply, mailer-daemon"
                  rows={2}
                />
                <p className="text-sm text-muted-foreground">
                  Emails from these domains will be ignored
                </p>
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Lead Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'admin' && (
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  System-wide settings for email integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>System Email Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure system-wide email processing rules and Round Robin assignment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Lead Import Statistics</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 border rounded">
                      <div className="font-medium">Total Leads Imported</div>
                      <div className="text-2xl font-bold text-primary">1,234</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">This Month</div>
                      <div className="text-2xl font-bold text-primary">89</div>
                    </div>
                  </div>
                </div>

                <Button variant="outline" onClick={() => window.location.href = '/admin/integrations'}>
                  Manage Integrations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 