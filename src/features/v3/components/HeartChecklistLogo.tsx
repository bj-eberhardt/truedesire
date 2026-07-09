type HeartChecklistLogoProps = {
  title?: string
}

export function HeartChecklistLogo({ title = 'TrueDesire' }: HeartChecklistLogoProps) {
  return (
    <svg viewBox="0 0 48 48" className="v3-logo-svg" role="img" aria-label={title}>
      <path
        d="M24 41s-14-8.6-18.3-18.2C3.2 17.2 6.4 12 12 12c3 0 5.6 1.5 7.3 3.7C21 13.5 23.6 12 26.6 12c5.6 0 8.8 5.2 6.3 10.8C38 32.4 24 41 24 41Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M26.8 18.5h10.4M26.8 24h10.4M26.8 29.5h10.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M29.1 18.5l1.6 1.6 3.2-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.1 24l1.6 1.6 3.2-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

