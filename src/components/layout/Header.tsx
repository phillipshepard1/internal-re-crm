'use client'

import { LogOut, User, Settings, Bell, Menu, Calendar, Shield, Phone, FileText, Home } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertModal } from '@/components/ui/alert-modal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { signOut, userRole, user } = useAuth()
  const router = useRouter()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [alertModal, setAlertModal] = useState<{
    open: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  })

  const handleLogout = async () => {
    try {
      // Clear all browser storage before calling signOut
      if (typeof window !== 'undefined') {
        // Clear localStorage completely
        localStorage.clear()
        
        // Clear sessionStorage completely
        sessionStorage.clear()
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos) : c
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        })
        
        // Clear Google OAuth related cookies specifically
        const googleCookies = [
          'G_AUTHUSER_H', 'SSID', 'SID', 'HSID', 'APISID', 'SAPISID', 
          'NID', '1P_JAR', 'AEC', 'OTZ'
        ]
        
        googleCookies.forEach(cookieName => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=google.com`
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })
        
        // Clear any remaining auth-related localStorage items
        const authKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.includes('auth') || key.includes('user') || key.includes('role') || key.includes('supabase'))) {
            authKeys.push(key)
          }
        }
        authKeys.forEach(key => localStorage.removeItem(key))
      }
      
      // Call the enhanced signOut function from AuthContext
      await signOut()
      
    } catch (error) {
      // Force clear everything even if signOut fails
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Force redirect to login
        window.location.href = '/login'
      }
    }
  }

  const handleSettings = () => {
    if (userRole === 'admin') {
      router.push('/admin')
    }
  }

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 md:h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-12 w-12 p-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-8 w-8" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
            
            <h1 className="text-xl sm:text-lg font-semibold">Internal-Re-CRM</h1>
            {userRole && (
              <span className="text-xs text-muted-foreground">
                ({userRole})
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-0.5 md:space-x-1">
            {/* Notifications */}
            <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="relative h-12 w-12 md:h-8 md:w-8 p-0"
                    >
                      <Bell className="h-6 w-6 md:h-4 md:w-4" />
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Notifications</DialogTitle>
                  <DialogDescription>
                    Your recent activities and reminders
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm">
                        <Bell className="mr-2 h-4 w-4 text-blue-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No new notifications
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-green-600" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          setNotificationsOpen(false)
                          router.push('/follow-ups')
                        }}
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        View Follow-ups
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          setNotificationsOpen(false)
                          router.push('/tasks')
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Tasks
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          setNotificationsOpen(false)
                          router.push('/dashboard')
                        }}
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Settings - Show for all users */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-12 w-12 md:h-8 md:w-8 p-0"
                    >
                      <Settings className="h-6 w-6 md:h-4 md:w-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Application settings and preferences
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {userRole === 'admin' && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => {
                            setSettingsOpen(false)
                            router.push('/admin')
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          setSettingsOpen(false)
                          setProfileOpen(true)
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        View Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        disabled
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        Notification Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Profile */}
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-12 w-12 md:h-8 md:w-8 p-0">
                      <User className="h-6 w-6 md:h-4 md:w-4" />
                      <span className="sr-only">Profile</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Profile</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Profile</DialogTitle>
                  <DialogDescription>
                    Your account information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Role:</span>
                        <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                          {userRole === 'admin' ? 'Administrator' : 'Agent'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">User ID:</span>
                        <span className="text-sm text-muted-foreground font-mono text-xs">
                          {user?.id?.slice(0, 8)}...
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setProfileOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        setProfileOpen(false)
                        setLogoutConfirmOpen(true)
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Logout (standalone for quick access) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-12 w-12 md:h-8 md:w-8 p-0"
                  onClick={() => setLogoutConfirmOpen(true)}
                >
                  <LogOut className="h-6 w-6 md:h-4 md:w-4" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Logout Confirmation Dialog */}
            <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirm Logout</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to logout? This will clear all your session data and redirect you to the login page.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setLogoutConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      setLogoutConfirmOpen(false)
                      handleLogout()
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal(prev => ({ ...prev, open }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </TooltipProvider>
  )
} 