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
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4.5v5h-5" />
      </svg>
    </button>
  );
}
