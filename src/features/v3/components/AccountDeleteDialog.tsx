import { useRef, useState } from "react";
import { ModalFrame } from "../../../components/ModalFrame";

type DeleteMode = "local" | "server";

type AccountDeleteDialogProps = {
  busyAction: "local" | "server" | null;
  open: boolean;
  onCancel: () => void;
  onDeleteAccount: () => Promise<void> | void;
  onDeleteLocal: () => Promise<void> | void;
};

export function AccountDeleteDialog({
  busyAction,
  open,
  onCancel,
  onDeleteAccount,
  onDeleteLocal
}: AccountDeleteDialogProps) {
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const [selectedMode, setSelectedMode] = useState<DeleteMode>("local");
  const busy = busyAction !== null;
  const isServerDelete = selectedMode === "server";
  const actionLabel = isServerDelete ? "Account endgültig löschen" : "Account auf Gerät löschen";

  if (!open) return null;

  return (
    <ModalFrame
      open={open}
      title="Account löschen?"
      overlayClassName="confirm-overlay"
      dialogClassName="confirm-dialog account-delete-dialog"
      testId="confirm-dialog"
      initialFocusRef={primaryButtonRef}
      onClose={onCancel}
    >
      <div className="confirm-title">Account löschen?</div>
      <div className="account-delete-options">
        <DeleteOption
          active={selectedMode === "local"}
          disabled={busy}
          testId="delete-local-option"
          title="Nur von diesem Gerät löschen"
          onSelect={() => setSelectedMode("local")}
        >
          Entfernt die lokalen Schlüssel und Kontodaten aus diesem Browser. Der Account bleibt
          serverseitig bestehen und kann mit einem Backup wiederhergestellt werden.
        </DeleteOption>
        <DeleteOption
          active={selectedMode === "server"}
          danger
          disabled={busy}
          testId="delete-server-option"
          title="Account endgültig löschen"
          onSelect={() => setSelectedMode("server")}
        >
          Markiert den Account serverseitig als gelöscht und entfernt ihn zusätzlich lokal. Dein
          Partner sieht dich anschließend als gelöscht. Das lässt sich nicht rückgängig machen.
        </DeleteOption>
      </div>
      <div className="confirm-actions account-delete-actions">
        <button
          type="button"
          className="secondary"
          data-testid="confirm-cancel-button"
          onClick={onCancel}
          disabled={busy}
        >
          Abbrechen
        </button>
        <button
          ref={primaryButtonRef}
          type="button"
          className={isServerDelete ? "danger" : "primary"}
          data-testid="confirm-confirm-button"
          onClick={() => (isServerDelete ? onDeleteAccount() : onDeleteLocal())}
          disabled={busy}
        >
          {busyAction ? "Löscht..." : actionLabel}
        </button>
      </div>
    </ModalFrame>
  );
}

function DeleteOption({
  active,
  children,
  danger,
  disabled,
  onSelect,
  testId,
  title
}: {
  active: boolean;
  children: string;
  danger?: boolean;
  disabled: boolean;
  onSelect: () => void;
  testId: string;
  title: string;
}) {
  return (
    <button
      type="button"
      className={`account-delete-option${danger ? " account-delete-option-danger" : ""}`}
      data-testid={testId}
      data-active={active ? "true" : "false"}
      data-danger={danger ? "true" : "false"}
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="account-delete-radio" aria-hidden="true" />
      <span className="account-delete-option-copy">
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </button>
  );
}
