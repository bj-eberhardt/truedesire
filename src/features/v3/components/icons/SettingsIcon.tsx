export function SettingsIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? 'v3-notice-icon'} aria-hidden="true">
      <path
        d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13.2a7.9 7.9 0 0 0 .05-1.2 7.9 7.9 0 0 0-.05-1.2l2-1.55-1.9-3.29-2.42.97a8.1 8.1 0 0 0-2.08-1.2L14.6 2h-3.8l-.4 2.73a8.1 8.1 0 0 0-2.08 1.2L5.9 4.96 4 8.25l2 1.55A7.9 7.9 0 0 0 6 12c0 .4.02.8.05 1.2L4 14.75l1.9 3.29 2.42-.97c.63.5 1.33.9 2.08 1.2L10.8 22h3.8l.4-2.73c.75-.3 1.45-.7 2.08-1.2l2.42.97 1.9-3.29-2-1.55Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

