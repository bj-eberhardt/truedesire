import { useState } from "react";
import { goV3Backup } from "../../../app/routes";
import { useAccountContext } from "../../../app/state";
import { AccountDeleteDialog } from "./AccountDeleteDialog";

type ProfileMenuProps = {
  open: boolean;
  pairingCode: string | null;
  onClose: () => void;
};

export function ProfileMenu(props: ProfileMenuProps) {
  const account = useAccountContext();
  const itemTabIndex = props.open ? 0 : -1;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"local" | "server" | null>(null);

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
            await account.copyPairingCode();
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
            goV3Backup();
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
          onClick={() => setConfirmOpen(true)}
        >
          Account löschen
        </button>

        <div className="v3-menu-hint"></div>
      </div>

      <AccountDeleteDialog
        open={confirmOpen}
        busyAction={busyAction}
        onCancel={() => setConfirmOpen(false)}
        onDeleteLocal={async () => {
          try {
            setBusyAction("local");
            await account.deleteLocalAccount();
            setConfirmOpen(false);
            props.onClose();
          } finally {
            setBusyAction(null);
          }
        }}
        onDeleteAccount={async () => {
          try {
            setBusyAction("server");
            await account.deleteAccount();
            setConfirmOpen(false);
            props.onClose();
          } finally {
            setBusyAction(null);
          }
        }}
      />
    </>
  );
}
