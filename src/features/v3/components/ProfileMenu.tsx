import { useState } from "react";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type ProfileMenuProps = {
  open: boolean;
  pairingCode: string | null;
  onCopyPairingCode: () => Promise<void> | void;
  onOpenBackup: () => void;
  onDeleteAccount: () => Promise<void> | void;
  onClose: () => void;
};

export function ProfileMenu(props: ProfileMenuProps) {
  const itemTabIndex = props.open ? 0 : -1;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <div
        className="v3-menu"
        data-testid="profile-menu"
        role="menu"
        aria-label="Profil-Menü"
        aria-hidden={!props.open}
        data-open={props.open ? "true" : "false"}
      >
        <button
          type="button"
          className="v3-menu-item"
          data-testid="profile-copy-code-button"
          role="menuitem"
          tabIndex={itemTabIndex}
          disabled={!props.pairingCode}
          onClick={async () => {
            if (!props.pairingCode) return;
            await props.onCopyPairingCode();
            props.onClose();
          }}
        >
          Pairing Code kopieren
        </button>

        <button
          type="button"
          className="v3-menu-item"
          data-testid="profile-open-backup-button"
          role="menuitem"
          tabIndex={itemTabIndex}
          onClick={async () => {
            props.onOpenBackup();
            props.onClose();
          }}
        >
          Backup erstellen
        </button>

        <button
          type="button"
          className="v3-menu-item v3-menu-danger"
          data-testid="profile-delete-account-button"
          role="menuitem"
          tabIndex={itemTabIndex}
          onClick={() => {
            setConfirmOpen(true);
          }}
        >
          Account löschen
        </button>

        <div className="v3-menu-hint"></div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Account löschen?"
        description="Das Löschen ist unwiderruflich – auch mit Backup kann der gelöschte Account nicht wiederhergestellt oder reaktiviert werden. Dein Partner sieht dich anschließend als gelöscht und Interaktion ist nicht mehr möglich. Für eine Rückkehr musst du ein neues Konto erstellen und dich erneut verknüpfen."
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        danger
        busy={isDeleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            setIsDeleting(true);
            await props.onDeleteAccount();
            setConfirmOpen(false);
            props.onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </>
  );
}
