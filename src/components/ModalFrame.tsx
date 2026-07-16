import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type ModalFrameProps = {
  open: boolean;
  title: string;
  overlayClassName: string;
  dialogClassName: string;
  testId: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  autoCloseMs?: number | null;
  onClose: () => void;
  children: ReactNode;
};

export function ModalFrame(props: ModalFrameProps) {
  const { autoCloseMs, initialFocusRef, onClose, open } = props;
  const fallbackFocusRef = useRef<HTMLDivElement | null>(null);
  const focusRef = initialFocusRef ?? fallbackFocusRef;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    window.setTimeout(() => focusRef.current?.focus(), 0);
    return () => prev?.focus?.();
  }, [focusRef, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const timeout = window.setTimeout(() => onClose(), autoCloseMs);
    return () => window.clearTimeout(timeout);
  }, [autoCloseMs, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className={props.overlayClassName} role="presentation" onMouseDown={props.onClose}>
      <div
        ref={initialFocusRef ? undefined : fallbackFocusRef}
        className={props.dialogClassName}
        data-testid={props.testId}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        tabIndex={initialFocusRef ? undefined : -1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {props.children}
      </div>
    </div>,
    document.body
  );
}
