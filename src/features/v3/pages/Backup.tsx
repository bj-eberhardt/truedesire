import { goV3 } from "../../../app/routes";
import { V3PageError, V3View } from "../components";
import { useBackupExportViewModel } from "./backup/useBackupExportViewModel";

export function BackupPage() {
  const backup = useBackupExportViewModel();

  return (
    <V3View
      className="v3-backup"
      title="Backup erstellen"
      subtitle="Speichere diese Informationen sicher. Ohne Backup sind alte Daten nicht wiederherstellbar."
      onBack={goV3}
      testId="backup-view"
      backTestId="backup-back-button"
    >
      {backup.error ? (
        <V3PageError testId="backup-error">{backup.error}</V3PageError>
      ) : (
        <div className="v3-backup-grid" data-testid="backup-grid">
          <label className="field v3-field v3-backup-text">
            <textarea
              data-testid="backup-export-textarea"
              value={backup.backupText}
              onChange={(e) => backup.setBackupText(e.target.value)}
              rows={14}
              spellCheck={false}
              disabled={backup.isLoading}
            />
          </label>

          <div className="v3-backup-actions">
            <button
              className="secondary"
              data-testid="backup-copy-button"
              onClick={() => void backup.copyBackupText()}
              disabled={!backup.backupText.trim()}
            >
              In Zwischenablage kopieren
            </button>
            <button
              className="secondary"
              data-testid="backup-download-button"
              onClick={backup.downloadBackup}
              disabled={!backup.backupText.trim()}
              title={`Lädt ${backup.filename} herunter`}
            >
              Download
            </button>
            {backup.copied ? (
              <div
                className="hint v3-copied"
                data-testid="backup-copied-status"
                role="status"
                aria-live="polite"
              >
                Kopiert.
              </div>
            ) : null}
            <div className="hint">
              Tipp: Lege das Backup in einem sicheren Passwort-Manager oder als Datei ab.
            </div>
          </div>
        </div>
      )}
    </V3View>
  );
}
