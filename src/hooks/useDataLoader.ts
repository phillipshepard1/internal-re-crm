import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Global cache for data across component remounts
const globalDataCache = new Map<string, {
  data: any
  timestamp: number
  loading: boolean
  error: string | null
}>()

// Cache cleanup interval (1 minute)
const CACHE_CLEANUP_INTERVAL = 1 * 60 * 1000

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of globalDataCache.entries()) {
    if (now - entry.timestamp > CACHE_CLEANUP_INTERVAL) {
      globalDataCache.delete(key)
    }
  }
}, CACHE_CLEANUP_INTERVAL)

// Global function to clear all cache (for debugging)
if (typeof window !== 'undefined') {
  (window as any).clearDataCache = () => {
    console.log('Clearing all data cache')
    globalDataCache.clear()
  }
  
  (window as any).getDataCacheInfo = () => {
    return {
      size: globalDataCache.size,
      keys: Array.from(globalDataCache.keys()),
      entries: Array.from(globalDataCache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        age: Date.now() - entry.timestamp,
        hasData: !!entry.data,
        hasError: !!entry.error
      }))
    }
  }
}

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
    cacheTimeout = 0, // No caching by default - always fetch fresh data
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

  // Component lifecycle management
  useEffect(() => {
    mountRef.current = true
    
    // Clear cache on mount to ensure fresh data
    if (effectiveCacheKey) {
      globalDataCache.delete(effectiveCacheKey)
    }

    return () => {
      mountRef.current = false
      
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [effectiveCacheKey])

  // Update load function ref when it changes
  useEffect(() => {
    loadFunctionRef.current = loadFunction
  }, [loadFunction])

  // Clear cache when user role changes
  useEffect(() => {
    if (effectiveCacheKey) {
      globalDataCache.delete(effectiveCacheKey)
    }
  }, [userRole, effectiveCacheKey])

  // Main data loading effect
  useEffect(() => {
    const userId = user?.id
    const timestamp = new Date().toISOString()
    
    // Main data loading effect triggered

    // Don't load if auth is still loading or user is not available
    if (authLoading || !userId || !enabled || !mountRef.current) {
      console.log('useDataLoader: Skipping load', { 
        authLoading, 
        userId: !!userId, 
        enabled, 
        mounted: mountRef.current,
        cacheKey: effectiveCacheKey 
      })
      return
    }

    // Check if we're already loading
    if (loadingRef.current) {
      console.log('useDataLoader: Already loading, skipping', { cacheKey: effectiveCacheKey })
      return
    }

    // Check cache first
    if (effectiveCacheKey && globalDataCache.has(effectiveCacheKey)) {
      const cached = globalDataCache.get(effectiveCacheKey)!
      const isExpired = Date.now() - cached.timestamp > cacheTimeout
      
      if (!isExpired) {
        console.log('useDataLoader: Using cached data', { cacheKey: effectiveCacheKey })
        setData(cached.data)
        setLoading(false)
        setError(null)
        onSuccess?.(cached.data)
        return
      } else {
        // Remove expired cache entry
        console.log('useDataLoader: Cache expired, removing', { cacheKey: effectiveCacheKey })
        globalDataCache.delete(effectiveCacheKey)
      }
    }

    // Starting data load process
    console.log('useDataLoader: Starting data load', { 
      cacheKey: effectiveCacheKey, 
      userId, 
      userRole 
    })

    const loadData = async () => {
      if (!mountRef.current || loadingRef.current) return

      loadingRef.current = true
      setLoading(true)
      setError(null)

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      // Add timeout to prevent hanging
      const timeoutMs = 30000 // 30 seconds timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout')), timeoutMs)
      })

      try {
        const result = await Promise.race([
          loadFunctionRef.current(userId, userRole || 'agent'),
          timeoutPromise
        ])

        // Check if component is still mounted
        if (!mountRef.current) {
          console.log('useDataLoader: Component unmounted during load', { cacheKey: effectiveCacheKey })
          return
        }

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          console.log('useDataLoader: Request aborted', { cacheKey: effectiveCacheKey })
          return
        }

        console.log('useDataLoader: Data loaded successfully', { 
          cacheKey: effectiveCacheKey,
          resultKeys: Object.keys(result || {}),
          activitiesCount: result?.activities?.length || 0
        })

        setData(result)
        setError(null)

        // Cache the result
        if (effectiveCacheKey) {
          console.log('useDataLoader: Caching data', { cacheKey: effectiveCacheKey })
          globalDataCache.set(effectiveCacheKey, {
            data: result,
            timestamp: Date.now(),
            loading: false,
            error: null
          })
        }

        onSuccess?.(result)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('useDataLoader: Data load error', { 
          cacheKey: effectiveCacheKey, 
          error: errorMessage 
        })
        setError(errorMessage)
        setData(null)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadData()
  }, [authLoading, user?.id, userRole, enabled, effectiveCacheKey, cacheTimeout, dependencies, onSuccess, onError])

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
  }, [user?.id, userRole, enabled, effectiveCacheKey, dependencies, onSuccess, onError])

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