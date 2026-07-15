export function ClipboardIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "v3-copy-code-icon"} aria-hidden="true">
      <path
        d="M9 5.5h6M9.75 4h4.5c.42 0 .75.33.75.75v1.5c0 .42-.33.75-.75.75h-4.5A.74.74 0 0 1 9 6.25v-1.5c0-.42.33-.75.75-.75Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.75 5.5h1.5c.97 0 1.75.78 1.75 1.75v11c0 .97-.78 1.75-1.75 1.75H6.75C5.78 20 5 19.22 5 18.25v-11c0-.97.78-1.75 1.75-1.75h1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 11h7M8.5 14.5h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
