type RefreshButtonProps = {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  title?: string;
  testId?: string;
};

export function RefreshButton({
  onClick,
  disabled,
  title = "Neu laden",
  testId = "refresh-button"
}: RefreshButtonProps) {
  return (
    <button
      className="secondary icon-btn"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 0 1-15.5 6.2" />
        <path d="M3 12A9 9 0 0 1 18.5 5.8" />
        <path d="M18 2v4h4" />
        <path d="M6 22v-4H2" />
      </svg>
    </button>
  );
}
