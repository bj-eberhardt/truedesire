import { useRef } from "react";
import { ModalFrame } from "./ModalFrame";

type InfoModalProps = {
  open: boolean;
  title: string;
  message: string;
  okLabel?: string;
  autoCloseMs?: number | null;
  onClose: () => void;
};

export function InfoModal(props: InfoModalProps) {
  const { open, title, message, okLabel = "OK", autoCloseMs = null } = props;
  const okBtnRef = useRef<HTMLButtonElement | null>(null);

  if (!open) return null;

  return (
    <ModalFrame
      open={open}
      title={title}
      overlayClassName="modal-overlay"
      dialogClassName="modal-dialog"
      testId="info-modal"
      initialFocusRef={okBtnRef}
      autoCloseMs={autoCloseMs}
      onClose={props.onClose}
    >
      <div className="modal-title">{title}</div>
      <div className="modal-desc">{message}</div>
      <div className="modal-actions">
        <button
          ref={okBtnRef}
          type="button"
          className="primary"
          data-testid="info-modal-ok-button"
          onClick={props.onClose}
        >
          {okLabel}
        </button>
      </div>
    </ModalFrame>
  );
}
