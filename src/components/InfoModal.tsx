import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type InfoModalProps = {
  open: boolean
  title: string
  message: string
  okLabel?: string
  autoCloseMs?: number | null
  onClose: () => void
}

export function InfoModal(props: InfoModalProps) {
  const { open, title, message, okLabel = 'OK', autoCloseMs = null } = props
  const okBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    window.setTimeout(() => okBtnRef.current?.focus(), 0)
    return () => prev?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, props])

  useEffect(() => {
    if (!open) return
    if (!autoCloseMs) return
    const t = window.setTimeout(() => props.onClose(), autoCloseMs)
    return () => window.clearTimeout(t)
  }, [autoCloseMs, open, props])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={props.onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-desc">{message}</div>
        <div className="modal-actions">
          <button ref={okBtnRef} type="button" className="primary" onClick={props.onClose}>
            {okLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

