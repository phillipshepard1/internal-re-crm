'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface LoadingProps {
  message?: string
  timeout?: number
  onTimeout?: () => void
  showTimeoutWarning?: boolean
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  timeout = 10000,
  onTimeout,
  showTimeoutWarning = true
}: LoadingProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [isProduction] = useState(process.env.NODE_ENV === 'production')

  useEffect(() => {
    if (showTimeoutWarning && timeout > 0) {
      const timer = setTimeout(() => {
        setShowWarning(true)
        onTimeout?.()
      }, timeout)

      return () => clearTimeout(timer)
    }
  }, [timeout, showTimeoutWarning, onTimeout])

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const handleClearStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">{message}</p>
        
        {showWarning && (
          <div className="max-w-sm mx-auto space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isProduction 
                  ? 'Loading is taking longer than expected. This might be due to network issues.'
                  : 'Loading timeout reached. Check console for errors.'
                }
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              
              {isProduction && (
                <Button onClick={handleClearStorage} variant="outline" size="sm">
                  Clear Storage & Reload
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function LoadingOverlay({ 
  message = 'Loading...', 
  timeout = 5000,
  onTimeout,
  showTimeoutWarning = true
}: LoadingProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [isProduction] = useState(process.env.NODE_ENV === 'production')

  useEffect(() => {
    if (showTimeoutWarning && timeout > 0) {
      const timer = setTimeout(() => {
        setShowWarning(true)
        onTimeout?.()
      }, timeout)

      return () => clearTimeout(timer)
    }
  }, [timeout, showTimeoutWarning, onTimeout])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
        
        {showWarning && (
          <Alert variant="destructive" className="max-w-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isProduction 
                ? 'Loading is taking longer than expected.'
                : 'Loading timeout reached.'
              }
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
} 