import { BackupIcon } from "../../components/icons/BackupIcon";

export function BackupSaveStep({
  downloadBackup,
  isDownloadingBackup
}: {
  downloadBackup: () => Promise<void>;
  isDownloadingBackup: boolean;
}) {
  return (
    <>
      <p className="v3-onboard-question">Backup sichern (optional)</p>
      <p className="hint">
        Das Backup enthält deine lokalen Schlüssel. Speichere es sicher, wenn du dein Konto später
        auf einem anderen Gerät wiederherstellen möchtest.
      </p>

      <div className="v3-backup-save-panel">
        <button
          className="secondary v3-backup-download-button"
          data-testid="onboarding-download-backup-button"
          disabled={isDownloadingBackup}
          onClick={() => void downloadBackup()}
        >
          <span>Backup herunterladen</span>
          <BackupIcon />
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
