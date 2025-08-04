'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Home,
  Users, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Mail,
  Shield,
  Target
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Inbox', href: '/inbox', icon: Mail },
  { name: 'People', href: '/people', icon: Users },
  { name: 'My Leads', href: '/my-leads', icon: Target },
  { name: 'Follow-ups', href: '/follow-ups', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Notes', href: '/notes', icon: FileText },
]

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
]

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const { userRole } = useAuth()

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-16 md:w-20 flex-col border-r bg-background transition-transform duration-300 ease-in-out md:sticky md:translate-x-0 h-screen",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 md:h-20 w-16 md:w-20 items-center justify-center">
          <div className="h-8 w-8 md:h-12 md:w-12 rounded-lg bg-primary"></div>
        </div>
        
        <nav className="flex flex-1 flex-col items-center space-y-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="h-12 w-12 md:h-14 md:w-14 p-0"
                    onClick={() => setOpen(false)} // Close mobile menu when clicking
                  >
                    <Link href={item.href}>
                      <IconComponent className="h-6 w-6 md:h-8 md:w-8" />
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
              <div className="h-px w-12 bg-border my-2"></div>
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                const IconComponent = item.icon
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant={isActive ? 'default' : 'ghost'}
                        size="sm"
                        className="h-10 w-10 md:h-12 md:w-12 p-0"
                        onClick={() => setOpen(false)} // Close mobile menu when clicking
                      >
                        <Link href={item.href}>
                          <IconComponent className="h-6 w-6 md:h-8 md:w-8" />
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