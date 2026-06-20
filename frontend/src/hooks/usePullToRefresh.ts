import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 80

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const startYRef = useRef<number | null>(null)
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.content')
    if (!el) return
    containerRef.current = el
    const content = el

    function onTouchStart(e: TouchEvent) {
      if (content.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta > 10 && content.scrollTop === 0) {
        setPulling(true)
      }
    }

    async function onTouchEnd(e: TouchEvent) {
      if (startYRef.current === null) return
      const delta = e.changedTouches[0].clientY - startYRef.current
      startYRef.current = null
      setPulling(false)
      if (delta >= THRESHOLD) {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh])

  return { pulling, refreshing }
}
