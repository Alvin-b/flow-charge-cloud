import { useState, useCallback, useEffect } from "react"

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50
}: SwipeOptions) {
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setStartY(e.touches[0].clientY)
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping) return
    
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    
    const diffX = currentX - startX
    const diffY = currentY - startY
    
    // Determine if horizontal or vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      // Horizontal swipe
      if (diffX > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
      setIsSwiping(false)
    } else if (Math.abs(diffY) > threshold) {
      // Vertical swipe
      if (diffY > 0 && onSwipeDown) {
        onSwipeDown()
      } else if (diffY < 0 && onSwipeUp) {
        onSwipeUp()
      }
      setIsSwiping(false)
    }
  }, [isSwiping, startX, startY, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)
  }, [])

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

  return { isSwiping }
}

// Hook for swipe-to-delete on list items
interface SwipeAction {
  icon: React.ReactNode
  color: string
  onClick: () => void
}

export function useSwipeToDelete(
  itemRef: React.RefObject<HTMLElement>,
  actions: SwipeAction[]
) {
  const [isOpen, setIsOpen] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const startX = e.touches[0].clientX
    itemRef.current?.setAttribute("data-touch-start", startX.toString())
  }, [itemRef])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const startX = parseFloat(itemRef.current?.getAttribute("data-touch-start") || "0")
    const currentX = e.touches[0].clientX
    const diff = startX - currentX
    
    if (diff > 0) {
      setTranslateX(Math.min(diff, 120))
    }
  }, [itemRef])

  const handleTouchEnd = useCallback(() => {
    if (translateX > 80) {
      setIsOpen(true)
    } else {
      setTranslateX(0)
    }
  }, [translateX])

  useEffect(() => {
    const el = itemRef.current
    if (!el) return

    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: true })
    el.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [itemRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isOpen, translateX, setTranslateX, setIsOpen }
}
