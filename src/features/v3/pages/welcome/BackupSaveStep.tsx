import { V3Notice } from "../../components";
import { InfoIcon } from "../../components/icons/InfoIcon";

export function BackupSaveStep({
  downloadBackup,
  finishOnboarding,
  isDownloadingBackup
}: {
  downloadBackup: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  isDownloadingBackup: boolean;
}) {
  return (
    <>
      <V3Notice
        className="v3-notice-success v3-onboard-success"
        icon={<InfoIcon />}
        title="Account angelegt"
        hint="Dein Konto wurde erfolgreich erstellt."
        testId="account-created-success"
      />
      <p className="v3-onboard-question">Backup anlegen (optional)</p>
      <p className="hint">
        Du kannst jetzt direkt ein Backup als Datei herunterladen. So kannst du dein Konto später
        auf einem anderen Gerät wiederherstellen.
      </p>

      <div className="row">
        <button
          className="secondary"
          data-testid="onboarding-download-backup-button"
          disabled={isDownloadingBackup}
          onClick={() => void downloadBackup()}
        >
          Backup herunterladen
        </button>
        <button
          className="primary"
          data-testid="onboarding-finish-button"
          onClick={() => void finishOnboarding()}
        >
          Fertigstellen
        </button>
      </div>
      {isDownloadingBackup ? (
        <div className="v3-notice v3-notice-info v3-notice-without-icon small" role="status">
          <div className="v3-notice-text">
            <strong>Download wird vorbereitet...</strong>
          </div>
        </div>
      ) : null}
    </>
  );
}
