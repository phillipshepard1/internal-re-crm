'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function LeadsRedirectPage() {
  const router = useRouter()
  const { userRole } = useAuth()

  useEffect(() => {
    // Redirect admins to admin panel, others to dashboard
    if (userRole === 'admin') {
      router.replace('/admin')
    } else {
      router.replace('/dashboard')
    }
  }, [userRole, router])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This page has been moved. Redirecting you to the appropriate location...
        </AlertDescription>
      </Alert>
    </div>
  )
} 