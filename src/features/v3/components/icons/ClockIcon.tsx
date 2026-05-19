export function ClockIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? 'v3-limit-notice-icon'} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v6l4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

