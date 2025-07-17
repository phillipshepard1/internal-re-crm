import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Global cache for data across component remounts
const globalDataCache = new Map<string, {
  data: any
  timestamp: number
  loading: boolean
  error: string | null
}>()

// Cache cleanup interval (5 minutes)
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of globalDataCache.entries()) {
    if (now - entry.timestamp > CACHE_CLEANUP_INTERVAL) {
      globalDataCache.delete(key)
    }
  }
}, CACHE_CLEANUP_INTERVAL)

interface UseDataLoaderOptions {
  enabled?: boolean
  cacheKey?: string
  cacheTimeout?: number // in milliseconds
  dependencies?: any[]
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface UseDataLoaderReturn {
  data: any
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  clearCache: () => void
}

export function useDataLoader(
  loadFunction: (userId: string, userRole: string) => Promise<any>,
  options: UseDataLoaderOptions = {}
): UseDataLoaderReturn {
  const {
    enabled = true,
    cacheKey,
    cacheTimeout = 2 * 60 * 1000, // 2 minutes default
    dependencies = [],
    onSuccess,
    onError
  } = options

  const { user, userRole, loading: authLoading } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use refs to prevent unnecessary effect triggers
  const loadFunctionRef = useRef(loadFunction)
  const mountRef = useRef(false)
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Generate cache key if not provided
  const effectiveCacheKey = useMemo(() => {
    if (cacheKey) return cacheKey
    if (!user?.id) return null
    return `data_${user.id}_${userRole}_${JSON.stringify(dependencies)}`
  }, [cacheKey, user?.id, userRole, dependencies])

  // Debug component lifecycle
  useEffect(() => {
    const userId = user?.id
    const timestamp = new Date().toISOString()
    const url = window.location.pathname
    
    console.log('useDataLoader: Hook mounted', {
      userId,
      userRole,
      timestamp,
      stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
    })

    mountRef.current = true

    return () => {
      console.log('useDataLoader: Hook unmounted', {
        userId,
        userRole,
        timestamp: new Date().toISOString(),
        url
      })
      
      mountRef.current = false
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [user?.id, userRole])

  // Effect cleanup logging
  useEffect(() => {
    return () => {
      const userId = user?.id
      const timestamp = new Date().toISOString()
      const url = window.location.pathname
      
      console.log('useDataLoader: Effect cleanup', {
        userId,
        userRole,
        timestamp,
        url
      })
    }
  }, [user?.id, userRole])

  // Update load function ref when it changes
  useEffect(() => {
    loadFunctionRef.current = loadFunction
  }, [loadFunction])

  // Main data loading effect
  useEffect(() => {
    const userId = user?.id
    const timestamp = new Date().toISOString()
    
    console.log('useDataLoader: Effect triggered', {
      authLoading,
      userId,
      userRole,
      enabled,
      dependencies,
      effectiveCacheKey,
      timestamp
    })

    // Don't load if auth is still loading or user is not available
    if (authLoading || !userId || !enabled || !mountRef.current) {
      return
    }

    // Check if we're already loading
    if (loadingRef.current) {
      console.log('useDataLoader: Already loading, skipping', { userId, userRole })
      return
    }

    // Check cache first
    if (effectiveCacheKey && globalDataCache.has(effectiveCacheKey)) {
      const cached = globalDataCache.get(effectiveCacheKey)!
      const isExpired = Date.now() - cached.timestamp > cacheTimeout
      
      if (!isExpired) {
        console.log('useDataLoader: Using cached data', {
          userId,
          userRole,
          cacheKey: effectiveCacheKey,
          timestamp
        })
        
        setData(cached.data)
        setLoading(false)
        setError(null)
        onSuccess?.(cached.data)
        return
      } else {
        // Remove expired cache entry
        globalDataCache.delete(effectiveCacheKey)
      }
    }

    console.log('useDataLoader: Starting data load process', {
      userId,
      userRole,
      timestamp,
      url: window.location.pathname
    })

    const loadData = async () => {
      if (!mountRef.current || loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      try {
        console.log('useDataLoader: Starting data load', {
          userId,
          userRole,
          timestamp: new Date().toISOString(),
          url: window.location.pathname
        })

        const result = await loadFunctionRef.current(userId, userRole || 'agent')

        // Check if component is still mounted
        if (!mountRef.current) {
          console.log('useDataLoader: Component unmounted during load, discarding result', {
            userId,
            userRole
          })
          return
        }

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          console.log('useDataLoader: Request aborted, discarding result', {
            userId,
            userRole
          })
          return
        }

        console.log('useDataLoader: Data loaded successfully', {
          userId,
          userRole,
          dataType: typeof result,
          timestamp: new Date().toISOString()
        })

        setData(result)
        setError(null)

        // Cache the result
        if (effectiveCacheKey) {
          globalDataCache.set(effectiveCacheKey, {
            data: result,
            timestamp: Date.now(),
            loading: false,
            error: null
          })
        }

        onSuccess?.(result)

      } catch (err) {
        // Check if component is still mounted
        if (!mountRef.current) {
          console.log('useDataLoader: Component unmounted during error, discarding error', {
            userId,
            userRole
          })
          return
        }

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          console.log('useDataLoader: Request aborted, discarding error', {
            userId,
            userRole
          })
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        
        console.error('useDataLoader: Error loading data', {
          userId,
          userRole,
          error: errorMessage,
          timestamp: new Date().toISOString()
        })

        setError(errorMessage)
        setData(null)

        // Cache the error
        if (effectiveCacheKey) {
          globalDataCache.set(effectiveCacheKey, {
            data: null,
            timestamp: Date.now(),
            loading: false,
            error: errorMessage
          })
        }

        onError?.(errorMessage)

      } finally {
        if (mountRef.current) {
          loadingRef.current = false
          setLoading(false)
        }
        abortControllerRef.current = null
      }
    }

    loadData()
  }, [authLoading, user?.id, userRole, enabled, effectiveCacheKey, cacheTimeout, onSuccess, onError])

  // Refetch function
  const refetch = useCallback(async () => {
    if (!user?.id || !enabled || !mountRef.current) return

    // Clear cache if it exists
    if (effectiveCacheKey) {
      globalDataCache.delete(effectiveCacheKey)
    }

    // Reset loading state
    loadingRef.current = false
    setLoading(false)
    setError(null)

    // Trigger a new load by updating dependencies
    const loadData = async () => {
      if (!mountRef.current || loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      abortControllerRef.current = new AbortController()

      try {
        const result = await loadFunctionRef.current(user.id, userRole || 'agent')

        if (!mountRef.current || abortControllerRef.current?.signal.aborted) return

        setData(result)
        setError(null)

        if (effectiveCacheKey) {
          globalDataCache.set(effectiveCacheKey, {
            data: result,
            timestamp: Date.now(),
            loading: false,
            error: null
          })
        }

        onSuccess?.(result)

      } catch (err) {
        if (!mountRef.current || abortControllerRef.current?.signal.aborted) return

        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        setData(null)

        if (effectiveCacheKey) {
          globalDataCache.set(effectiveCacheKey, {
            data: null,
            timestamp: Date.now(),
            loading: false,
            error: errorMessage
          })
        }

        onError?.(errorMessage)

      } finally {
        if (mountRef.current) {
          loadingRef.current = false
          setLoading(false)
        }
        abortControllerRef.current = null
      }
    }

    loadData()
  }, [user?.id, userRole, enabled, effectiveCacheKey, onSuccess, onError])

  // Clear cache function
  const clearCache = useCallback(() => {
    if (effectiveCacheKey) {
      globalDataCache.delete(effectiveCacheKey)
    }
  }, [effectiveCacheKey])

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  }
} 