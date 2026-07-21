export function BackupIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "v3-button-icon"} aria-hidden="true">
      <path
        d="M7.2 18.5H7a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.45-1.7A4.8 4.8 0 0 1 17.8 18.5h-1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 11.5v7M9.5 16l2.5 2.5 2.5-2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.8 20.5h6.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
