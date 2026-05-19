import { useEffect, useMemo, useRef, useState } from 'react'

type BackupPageProps = {
  identityCode: string | null
  onBack: () => void
  onExportBackupText: () => Promise<string>
}

function formatJsonMaybe(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function BackupPage(props: BackupPageProps) {
  const { identityCode, onBack, onExportBackupText } = props

  const [backupText, setBackupText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const [copied, setCopied] = useState(false)

  const filename = useMemo(() => {
    const base = (identityCode ?? 'backup').trim()
    const safe = base.replace(/[^a-zA-Z0-9_-]+/g, '') || 'backup'
    return `${safe}.json`
  }, [identityCode])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    onExportBackupText()
      .then((txt) => {
        if (cancelled) return
        setBackupText(formatJsonMaybe(txt))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onExportBackupText])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  return (
    <section className="card v3-card v3-view v3-backup">
      <div className="v3-view-head">
        <button className="secondary" onClick={onBack}>
          ← Zurück
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Backup erstellen</h2>
          <p className="hint v3-subtitle">Speichere diese Informationen sicher. Ohne Backup sind alte Daten nicht wiederherstellbar.</p>
        </div>
      </div>

      <div className="divider" />

      {error ? (
        <div className="inline-error">{error}</div>
      ) : (
        <div className="v3-backup-grid">
          <label className="field v3-field v3-backup-text">
            <textarea value={backupText} onChange={(e) => setBackupText(e.target.value)} rows={14} spellCheck={false} disabled={isLoading} />
          </label>

          <div className="v3-backup-actions">
            <button
              className="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(backupText)
                setCopied(true)
                if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
                copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400)
              }}
              disabled={!backupText.trim()}
            >
              In Zwischenablage kopieren
            </button>
            <button
              className="secondary"
              onClick={() => downloadTextFile(filename, backupText)}
              disabled={!backupText.trim()}
              title={`Lädt ${filename} herunter`}
            >
              Download
            </button>
            {copied ? (
              <div className="hint v3-copied" role="status" aria-live="polite">
                Kopiert.
              </div>
            ) : null}
            <div className="hint">
              Tipp: Lege das Backup in einem sicheren Passwort-Manager oder als Datei ab.
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
