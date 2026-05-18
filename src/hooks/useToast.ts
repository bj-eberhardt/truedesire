import { useCallback, useRef, useState } from 'react'

type UseToastResult = {
  toast: string | null
  showToast: (message: string) => void
}

export function useToast(timeoutMs = 1600): UseToastResult {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback(
    (message: string) => {
      setToast(message)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setToast(null), timeoutMs)
    },
    [timeoutMs],
  )

  return { toast, showToast }
}

