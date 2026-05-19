import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, title, description, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger, busy } = props
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    window.setTimeout(() => confirmBtnRef.current?.focus(), 0)
    return () => prev?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, props])

  if (!open) return null

  return createPortal(
    <div className="confirm-overlay" role="presentation" onMouseDown={props.onCancel}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        <div className="confirm-desc">{description}</div>
        <div className="confirm-actions">
          <button type="button" className="secondary" onClick={props.onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={danger ? 'danger' : 'primary'}
            onClick={() => props.onConfirm()}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
