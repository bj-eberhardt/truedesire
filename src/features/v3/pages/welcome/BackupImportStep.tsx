import type { RefObject } from "react";

export function BackupImportStep({
  backupFileInputRef,
  backupFileName,
  backupText,
  clearBackupFileSelection,
  importSuccessVisible,
  onBack,
  selectBackupFile,
  setBackupText,
  submitBackupImport
}: {
  backupFileInputRef: RefObject<HTMLInputElement | null>;
  backupFileName: string | null;
  backupText: string;
  clearBackupFileSelection: () => void;
  importSuccessVisible: boolean;
  onBack: () => void;
  selectBackupFile: (file: File | null) => void;
  setBackupText: (value: string) => void;
  submitBackupImport: () => Promise<void>;
}) {
  return (
    <>
      <p className="v3-onboard-question">
        Lade ein bestehendes Backup als Datei hoch, oder füge deinen Backup-Text in die Textbox ein.
      </p>

      <div className="v3-import-panel">
        <div className="v3-import-col">
          <div className="v3-import-heading">Backup via Datei</div>
          <input
            ref={backupFileInputRef}
            className="v3-import-file-input"
            data-testid="backup-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(e) => selectBackupFile(e.currentTarget.files?.[0] ?? null)}
          />
          <div className="v3-import-file-row">
            <button
              type="button"
              className="secondary"
              data-testid="backup-file-select-button"
              onClick={() => backupFileInputRef.current?.click()}
            >
              Backup-Datei auswählen
            </button>
            {backupFileName ? (
              <button
                type="button"
                className="secondary"
                data-testid="backup-file-clear-button"
                onClick={clearBackupFileSelection}
              >
                Auswahl löschen
              </button>
            ) : null}
          </div>
          {backupFileName ? (
            <div className="hint">Ausgewählt: {backupFileName}</div>
          ) : (
            <div className="hint">Wähle die Backup .json Datei aus</div>
          )}
        </div>

        <div className="v3-import-col">
          <div className="v3-import-heading">Backup über Text</div>
          <label className="field v3-field">
            <textarea
              data-testid="backup-import-textarea"
              value={backupText}
              onChange={(e) => setBackupText(e.target.value)}
              placeholder='{"version": ...}'
              rows={10}
            />
          </label>
          <div className="hint">Kopiere dein Backup-JSON-Text in die Textbox.</div>
        </div>
      </div>

      {importSuccessVisible ? (
        <div
          className="v3-notice v3-notice-success v3-notice-without-icon small"
          data-testid="backup-import-success"
          role="status"
        >
          <div className="v3-notice-text">
            <strong>Backup erfolgreich eingespielt.</strong>
            <span>Du wirst gleich zur Home-Seite weitergeleitet.</span>
          </div>
        </div>
      ) : null}

      <div className="row">
        <button
          className="primary"
          data-testid="backup-import-submit-button"
          onClick={submitBackupImport}
        >
          Importieren und prüfen
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="backup-import-back-button"
          onClick={onBack}
        >
          Zurück
        </button>
      </div>
    </>
  );
}
