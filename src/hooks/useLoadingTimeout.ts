import { useEffect, useRef } from 'react'

interface UseLoadingTimeoutOptions {
  loading: boolean
  timeoutMs?: number
  onTimeout?: () => void
  enabled?: boolean
}

export function useLoadingTimeout({
  loading,
  timeoutMs = 30000, // 30 seconds default
  onTimeout,
  enabled = true
}: UseLoadingTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled || !loading) {
      // Clear timeout if not loading or disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // Start loading
    startTimeRef.current = Date.now()
    
    // Set timeout
    timeoutRef.current = setTimeout(() => {
      const loadTime = Date.now() - startTimeRef.current
      console.error('Loading timeout detected', {
        loadTime: `${loadTime}ms`,
        timeoutMs,
        url: window.location.pathname
      })
      
      if (onTimeout) {
        onTimeout()
      }
    }, timeoutMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [loading, timeoutMs, onTimeout, enabled])

  return {
    startTime: startTimeRef.current,
    loadTime: startTimeRef.current ? Date.now() - startTimeRef.current : 0
  }
} 