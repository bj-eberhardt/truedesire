import { useRef } from "react";
import { ModalFrame } from "./ModalFrame";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    title,
    description,
    confirmLabel = "Bestätigen",
    cancelLabel = "Abbrechen",
    danger,
    busy
  } = props;
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  if (!open) return null;

  return (
    <ModalFrame
      open={open}
      title={title}
      overlayClassName="confirm-overlay"
      dialogClassName="confirm-dialog"
      testId="confirm-dialog"
      initialFocusRef={confirmBtnRef}
      onClose={props.onCancel}
    >
      <div className="confirm-title">{title}</div>
      <div className="confirm-desc">{description}</div>
      <div className="confirm-actions">
        <button
          type="button"
          className="secondary"
          data-testid="confirm-cancel-button"
          onClick={props.onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          type="button"
          className={danger ? "danger" : "primary"}
          data-testid="confirm-confirm-button"
          onClick={() => props.onConfirm()}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalFrame>
  );
}
