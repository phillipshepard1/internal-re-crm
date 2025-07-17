import { useState, useCallback, useRef } from 'react'

interface GlobalLoadingState {
  isLoading: boolean
  loadingTasks: Set<string>
  startLoading: (taskId: string) => void
  stopLoading: (taskId: string) => void
  isTaskLoading: (taskId: string) => boolean
}

const globalLoadingState = {
  isLoading: false,
  loadingTasks: new Set<string>(),
  listeners: new Set<(state: GlobalLoadingState) => void>()
}

function notifyListeners() {
  const state: GlobalLoadingState = {
    isLoading: globalLoadingState.loadingTasks.size > 0,
    loadingTasks: new Set(globalLoadingState.loadingTasks),
    startLoading: () => {}, // Will be overridden by hook
    stopLoading: () => {}, // Will be overridden by hook
    isTaskLoading: () => false // Will be overridden by hook
  }
  
  globalLoadingState.listeners.forEach(listener => listener(state))
}

export function useGlobalLoading(): GlobalLoadingState {
  const [state, setState] = useState<GlobalLoadingState>(() => ({
    isLoading: globalLoadingState.loadingTasks.size > 0,
    loadingTasks: new Set(globalLoadingState.loadingTasks),
    startLoading: () => {},
    stopLoading: () => {},
    isTaskLoading: () => false
  }))

  const startLoading = useCallback((taskId: string) => {
    globalLoadingState.loadingTasks.add(taskId)
    notifyListeners()
  }, [])

  const stopLoading = useCallback((taskId: string) => {
    globalLoadingState.loadingTasks.delete(taskId)
    notifyListeners()
  }, [])

  const isTaskLoading = useCallback((taskId: string) => {
    return globalLoadingState.loadingTasks.has(taskId)
  }, [])

  // Subscribe to global state changes
  const listenerRef = useRef<(state: GlobalLoadingState) => void | undefined>(undefined)
  
  if (!listenerRef.current) {
    listenerRef.current = (newState: GlobalLoadingState) => {
      setState({
        ...newState,
        startLoading,
        stopLoading,
        isTaskLoading
      })
    }
    globalLoadingState.listeners.add(listenerRef.current)
  }

  // Cleanup listener on unmount
  const cleanupRef = useRef<(() => void) | null>(null)
  
  if (!cleanupRef.current) {
    cleanupRef.current = () => {
      if (listenerRef.current) {
        globalLoadingState.listeners.delete(listenerRef.current)
      }
    }
  }

  return {
    isLoading: state.isLoading,
    loadingTasks: state.loadingTasks,
    startLoading,
    stopLoading,
    isTaskLoading
  }
} 