import { useState, useEffect, useCallback } from "react"

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  resistance?: number
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
}

export function usePullToRefresh({ onRefresh, threshold = 80, resistance = 2.5 }: PullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0
  })
  
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only enable pull to refresh when at top of page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY)
      setState(prev => ({ ...prev, isPulling: true }))
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || state.isRefreshing) return
    
    const currentTouchY = e.touches[0].clientY
    const pullDistance = (currentTouchY - startY) / resistance
    
    if (pullDistance > 0) {
      setCurrentY(currentTouchY)
      setState(prev => ({
        ...prev,
        pullDistance: Math.min(pullDistance, threshold * 1.5)
      }))
    }
  }, [state.isPulling, state.isRefreshing, startY, resistance, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (state.pullDistance >= threshold && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, isPulling: false }))
      
      try {
        await onRefresh()
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0
        })
      }
    } else {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0
      }))
    }
  }, [state.pullDistance, state.isRefreshing, threshold, onRefresh])

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    ...state,
    progress: Math.min(state.pullDistance / threshold, 1)
  }
}
