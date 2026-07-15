import { useEffect, useMemo, useRef, useState } from "react";
import { goV3 } from "../../../app/routes";
import { useAccountContext, useSessionContext } from "../../../app/state";
import { V3PageError } from "../components/V3PageState";
import { V3View } from "../components/V3View";
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from "../lib/backup";
import { toUserMessage } from "../lib/errors";

export function BackupPage() {
  const { identity } = useSessionContext();
  const { exportBackupText } = useAccountContext();
  const [backupText, setBackupText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const filename = useMemo(() => safeBackupFilename(identity?.code ?? null), [identity?.code]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    exportBackupText()
      .then((txt) => {
        if (cancelled) return;
        setBackupText(formatJsonMaybe(txt));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(toUserMessage(e));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exportBackupText]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <V3View
      className="v3-backup"
      title="Backup erstellen"
      subtitle="Speichere diese Informationen sicher. Ohne Backup sind alte Daten nicht wiederherstellbar."
      onBack={goV3}
      testId="backup-view"
      backTestId="backup-back-button"
    >
      {error ? (
        <V3PageError testId="backup-error">{error}</V3PageError>
      ) : (
        <div className="v3-backup-grid" data-testid="backup-grid">
          <label className="field v3-field v3-backup-text">
            <textarea
              data-testid="backup-export-textarea"
              value={backupText}
              onChange={(e) => setBackupText(e.target.value)}
              rows={14}
              spellCheck={false}
              disabled={isLoading}
            />
          </label>

          <div className="v3-backup-actions">
            <button
              className="secondary"
              data-testid="backup-copy-button"
              onClick={async () => {
                await navigator.clipboard.writeText(backupText);
                setCopied(true);
                if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
                copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
              }}
              disabled={!backupText.trim()}
            >
              In Zwischenablage kopieren
            </button>
            <button
              className="secondary"
              data-testid="backup-download-button"
              onClick={() => downloadTextFile({ filename, content: backupText })}
              disabled={!backupText.trim()}
              title={`Lädt ${filename} herunter`}
            >
              Download
            </button>
            {copied ? (
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
