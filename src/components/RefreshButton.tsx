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
      <span aria-hidden="true">?</span>
    </button>
  );
}
