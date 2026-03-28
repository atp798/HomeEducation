import { useRef } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 150 }: UseSwipeOptions): SwipeHandlers {
  const startX = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return
    const endX = e.changedTouches[0].clientX
    const diff = endX - startX.current
    if (Math.abs(diff) >= threshold) {
      if (diff < 0 && onSwipeLeft) onSwipeLeft()
      if (diff > 0 && onSwipeRight) onSwipeRight()
    }
    startX.current = null
  }

  return { onTouchStart, onTouchEnd }
}
