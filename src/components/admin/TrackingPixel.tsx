'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Copy, 
  RefreshCw, 
  Globe, 
  Users, 
  TrendingUp, 
  Code,
  CheckCircle,
  AlertCircle,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PixelStats {
  total_leads: number
  by_source: Record<string, number>
  by_status: Record<string, number>
  by_domain: Record<string, number>
  daily_counts: Record<string, number>
  conversion_rate: number
}

interface RecentLead {
  id: string
  first_name: string
  last_name: string
  email: string[]
  phone?: string[]
  city?: string
  state?: string
  notes?: string
  created_at: string
  lead_source?: string
  pixel_source_url?: string
  lead_status: string
}

interface ApiKey {
  id: string
  key: string
  name: string
  website: string
  created_at: string
  last_used?: string
  leads_count: number
  is_active: boolean
}

export function TrackingPixelDashboard() {
  const [stats, setStats] = useState<PixelStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyWebsite, setNewKeyWebsite] = useState('')
  const [selectedApiKey, setSelectedApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeysLoading, setApiKeysLoading] = useState(true)
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pixel/stats?days=30')
      const data = await response.json()
      
      if (data.status === 'success') {
        setStats(data.stats)
        setRecentLeads(data.recent_leads || [])
      }
    } catch (error) {
      console.error('Error fetching pixel stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch API keys from database
  const fetchApiKeys = async () => {
    try {
      setApiKeysLoading(true)
      const response = await fetch('/api/pixel/keys', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setApiKeys(data.apiKeys || [])
        // Set first key as selected if available
        if (data.apiKeys && data.apiKeys.length > 0 && !selectedApiKey) {
          setSelectedApiKey(data.apiKeys[0].key)
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
    } finally {
      setApiKeysLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchApiKeys()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleLeadExpansion = (leadId: string) => {
    setExpandedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName || !newKeyWebsite) return
    
    try {
      const response = await fetch('/api/pixel/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName,
          website: newKeyWebsite
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh API keys list
        await fetchApiKeys()
        setNewKeyName('')
        setNewKeyWebsite('')
        setShowNewKeyDialog(false)
      } else {
        console.error('Failed to create API key:', data.error)
      }
    } catch (error) {
      console.error('Error creating API key:', error)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/pixel/keys?id=${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh API keys list
        await fetchApiKeys()
      } else {
        console.error('Failed to delete API key:', data.error)
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const getInstallationCode = () => {
    // Use production URL if available, otherwise use current origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const productionUrl = baseUrl.includes('localhost') ? 'https://app.stresslesscrm.com' : baseUrl
    
    return `<!-- CRM Tracking Pixel -->
<script src="${productionUrl}/pixel.js"></script>
<script>
  CRMPixel.setConfig({
    apiEndpoint: '${productionUrl}/api/pixel/capture',
    apiKey: '${selectedApiKey}',
    debug: false
  }).init();
</script>`
  }

  const getWordPressCode = () => {
    // Use production URL if available, otherwise use current origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const productionUrl = baseUrl.includes('localhost') ? 'https://app.stresslesscrm.com' : baseUrl
    
    return `// Add to your theme's functions.php file
function add_crm_tracking_pixel() {
    ?>
    <!-- CRM Tracking Pixel -->
    <script src="${productionUrl}/pixel.js"></script>
    <script>
      CRMPixel.setConfig({
        apiEndpoint: '${productionUrl}/api/pixel/capture',
        apiKey: '${selectedApiKey}',
        debug: false
      }).init();
    </script>
    <?php
}
add_action('wp_footer', 'add_crm_tracking_pixel');`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tracking Pixel</h2>
          <p className="text-muted-foreground">
            Capture leads automatically from any website
          </p>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pixel Leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_leads || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversion_rate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Websites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.by_domain ? Object.keys(stats.by_domain).length : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today's Leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.daily_counts?.[new Date().toISOString().split('T')[0]] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Captured today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="recent">Recent Leads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installation Instructions</CardTitle>
              <CardDescription>
                Add this code to your website to start capturing leads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>1. Select API Key</Label>
                <select 
                  className="w-full mt-2 p-2 border rounded"
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                >
                  {apiKeys.map(key => (
                    <option key={key.key} value={key.key}>
                      {key.name} - {key.website}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>2. Copy Installation Code</Label>
                <div className="relative mt-2">
                  <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                    {getInstallationCode()}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(getInstallationCode())}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label>3. Add to Your Website</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Paste this code just before the closing {'</body>'} tag on every page where you want to track forms.
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The pixel will automatically detect and track all forms on your website. 
                  No additional configuration needed!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* WordPress Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>WordPress Installation</CardTitle>
              <CardDescription>
                Special instructions for WordPress sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                {getWordPressCode()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage API keys for different websites
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewKeyDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map(apiKey => (
                  <div key={apiKey.key} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apiKey.name}</span>
                        <Badge variant="outline">{apiKey.leads_count} leads</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {apiKey.website}
                        </span>
                        <span>
                          Created: {new Date(apiKey.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {showApiKey ? apiKey.key : '••••••••••••••••'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Leads Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Pixel Leads</CardTitle>
              <CardDescription>
                Latest leads captured via tracking pixel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pixel leads captured yet
                  </div>
                ) : (
                  recentLeads.map(lead => {
                    const isExpanded = expandedLeads.has(lead.id)
                    return (
                      <div key={lead.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">
                                {lead.first_name} {lead.last_name}
                              </div>
                              <Badge variant={lead.lead_status === 'assigned' ? 'default' : 'secondary'}>
                                {lead.lead_status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {lead.email?.[0] && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {lead.email[0]}
                                </span>
                              )}
                              {lead.phone?.[0] && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone[0]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>
                                From: {lead.pixel_source_url ? 
                                  (lead.pixel_source_url.startsWith('http') ? 
                                    new URL(lead.pixel_source_url).hostname : 
                                    lead.pixel_source_url
                                  ) : 
                                  lead.lead_source?.replace('pixel_', '') || 'Unknown'
                                }
                              </span>
                              <span>
                                {new Date(lead.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLeadExpansion(lead.id)}
                          >
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </Button>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {lead.city && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                                  <div className="text-sm flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {lead.city}{lead.state ? `, ${lead.state}` : ''}
                                  </div>
                                </div>
                              )}
                              {lead.notes && (
                                <div className="col-span-2">
                                  <div className="text-xs text-muted-foreground mb-1">Notes / Property Details</div>
                                  <div className="text-sm whitespace-pre-wrap bg-background p-2 rounded">
                                    {lead.notes}
                                  </div>
                                </div>
                              )}
                              {lead.pixel_source_url && (
                                <div className="col-span-2">
                                  <div className="text-xs text-muted-foreground mb-1">Source URL</div>
                                  <div className="text-sm text-blue-600 hover:underline">
                                    <a href={lead.pixel_source_url} target="_blank" rel="noopener noreferrer">
                                      {lead.pixel_source_url}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leads by Domain */}
            <Card>
              <CardHeader>
                <CardTitle>Leads by Website</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.by_domain && Object.entries(stats.by_domain).map(([domain, count]) => (
                    <div key={domain} className="flex justify-between items-center">
                      <span className="text-sm">{domain}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leads by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.by_status && Object.entries(stats.by_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{status}</span>
                      <Badge variant={status === 'assigned' ? 'default' : 'secondary'}>
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Lead Capture</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.daily_counts && 
                  Object.entries(stats.daily_counts)
                    .slice(-7)
                    .reverse()
                    .map(([date, count]) => (
                      <div key={date} className="flex justify-between items-center">
                        <span className="text-sm">
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min((count / Math.max(...Object.values(stats.daily_counts))) * 100, 100)}%` }}
                            />
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      </div>
                    ))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New API Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for a website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Website Name</Label>
              <Input
                id="name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Main Website"
              />
            </div>
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                value={newKeyWebsite}
                onChange={(e) => setNewKeyWebsite(e.target.value)}
                placeholder="e.g., https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApiKey} disabled={!newKeyName || !newKeyWebsite}>
              Create API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}