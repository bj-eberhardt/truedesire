export function InfoIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "v3-notice-icon"} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}
