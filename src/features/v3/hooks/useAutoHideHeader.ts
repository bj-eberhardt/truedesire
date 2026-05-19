import { useEffect, useRef, useState } from 'react'

type UseAutoHideHeaderOptions = {
  enabled: boolean
  menuOpen: boolean
  mobileMaxWidthPx?: number
  thresholdPx?: number
}

export function useAutoHideHeader({
  enabled,
  menuOpen,
  mobileMaxWidthPx = 768,
  thresholdPx = 12,
}: UseAutoHideHeaderOptions): boolean {
  const [hidden, setHidden] = useState(false)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setHidden(false)
      return
    }

    const media = window.matchMedia(`(max-width: ${mobileMaxWidthPx}px)`)
    const shouldRun = () => media.matches

    let rafPending = false

    const onScroll = () => {
      if (rafPending) return
      rafPending = true
      window.requestAnimationFrame(() => {
        rafPending = false
        if (!shouldRun()) {
          setHidden(false)
          lastScrollYRef.current = window.scrollY
          return
        }
        if (menuOpen) {
          setHidden(false)
          lastScrollYRef.current = window.scrollY
          return
        }

        const y = window.scrollY
        if (y <= 8) {
          setHidden(false)
          lastScrollYRef.current = y
          return
        }

        const delta = y - lastScrollYRef.current
        if (Math.abs(delta) < thresholdPx) return

        if (delta > 0) setHidden(true)
        else setHidden(false)

        lastScrollYRef.current = y
      })
    }

    // Init
    lastScrollYRef.current = window.scrollY
    setHidden(false)

    window.addEventListener('scroll', onScroll, { passive: true })
    const onMediaChange = () => {
      if (!shouldRun()) setHidden(false)
      lastScrollYRef.current = window.scrollY
    }
    media.addEventListener?.('change', onMediaChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
      media.removeEventListener?.('change', onMediaChange)
    }
  }, [enabled, menuOpen, mobileMaxWidthPx, thresholdPx])

  return hidden
}

