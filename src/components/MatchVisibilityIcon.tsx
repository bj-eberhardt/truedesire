type MatchVisibilityIconProps = {
  hidden: boolean;
};

export function MatchVisibilityIcon({ hidden }: MatchVisibilityIconProps) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" className="inline-icon" role="presentation" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M2.5 12s3.5-6 9.5-6a10.2 10.2 0 0 1 6.7 2.4M21.5 12s-3.5 6-9.5 6a10 10 0 0 1-4.5-1"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="inline-icon" role="presentation" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
