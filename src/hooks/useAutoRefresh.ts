import { useEffect, useRef } from 'react'

export function useAutoRefresh(enabled: boolean, refresh: () => Promise<void> | void, intervalMs = 5000) {
  const pollInFlightRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const interval = window.setInterval(async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      try {
        await refresh()
      } catch {
        // ignore polling errors
      } finally {
        pollInFlightRef.current = false
      }
    }, intervalMs)
    return () => window.clearInterval(interval)
  }, [enabled, intervalMs, refresh])
}

