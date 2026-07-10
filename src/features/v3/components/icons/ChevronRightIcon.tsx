export function ChevronRightIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "v3-nav-icon"} aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
