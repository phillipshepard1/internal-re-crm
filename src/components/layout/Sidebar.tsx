'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Settings,
  Home
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Follow-ups', href: '/follow-ups', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Notes', href: '/notes', icon: FileText },
]

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { userRole } = useAuth()

  return (
    <TooltipProvider>
      <div className="flex h-full w-16 flex-col items-center space-y-4 border-r bg-background py-4">
        <div className="flex h-16 w-16 items-center justify-center">
          <div className="h-8 w-8 rounded-lg bg-primary"></div>
        </div>
        
        <nav className="flex flex-1 flex-col items-center space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="h-10 w-10 p-0"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span className="sr-only">{item.name}</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
          
          {userRole === 'admin' && (
            <>
              <div className="h-px w-8 bg-border my-2"></div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant={isActive ? 'default' : 'ghost'}
                        size="sm"
                        className="h-10 w-10 p-0"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span className="sr-only">{item.name}</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </>
          )}
        </nav>
      </div>
    </TooltipProvider>
  )
} 