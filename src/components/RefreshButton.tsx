type RefreshButtonProps = {
  onClick: () => void | Promise<void>
  disabled?: boolean
  title?: string
}

export function RefreshButton({ onClick, disabled, title = 'Neu laden' }: RefreshButtonProps) {
  return (
    <button className="secondary icon-btn" onClick={onClick} disabled={disabled} aria-label={title} title={title}>
      <span aria-hidden="true">↻</span>
    </button>
  )
}

