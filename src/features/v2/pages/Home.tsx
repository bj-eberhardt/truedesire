import { useMemo, useState } from 'react'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import type { PairingIncoming, PairingOutgoing, MyPairs } from '../../../hooks/usePairing'

type HomePageProps = {
  isBootstrappingAccount: boolean
  identity: { userId: string; nickname: string; code?: string | null } | null
  nickname: string
  onNicknameChange: (next: string) => void
  onRegister: () => Promise<void>

  onExportBackup: () => Promise<void>
  onDeleteAccount: () => Promise<void>

  myPairs: MyPairs
  pairingIncoming: PairingIncoming
  pairingOutgoing: PairingOutgoing
  pairingInlineError: string | null
  onClearPairingInlineError: () => void
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>
  onRespondPairing: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>
  onOpenPair: (pairId: string) => Promise<void>

  onImportBackupText: (txt: string) => Promise<void>
}

export function HomePage(props: HomePageProps) {
  const [onboardPath, setOnboardPath] = useState<'start' | 'backup' | 'new'>('start')
  const [backupText, setBackupText] = useState('')
  const [onboardError, setOnboardError] = useState<string | null>(null)
  const [partnerCodeInput, setPartnerCodeInput] = useState('')

  const hasIdentity = !!props.identity?.userId

  const groupedRequests = useMemo(() => {
    const grouped = new Map<string, { nickname: string; code: string; incomingIds: string[]; outgoingIds: string[] }>()
    for (const r of props.pairingIncoming) {
      const key = `${r.from.code}|${r.from.nickname}`
      const existing = grouped.get(key) ?? { nickname: r.from.nickname, code: r.from.code, incomingIds: [], outgoingIds: [] }
      existing.incomingIds.push(r.id)
      grouped.set(key, existing)
    }
    for (const r of props.pairingOutgoing) {
      const key = `${r.to.code}|${r.to.nickname}`
      const existing = grouped.get(key) ?? { nickname: r.to.nickname, code: r.to.code, incomingIds: [], outgoingIds: [] }
      existing.outgoingIds.push(r.id)
      grouped.set(key, existing)
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[1].nickname.localeCompare(b[1].nickname, 'de'))
      .map(([, row]) => row)
  }, [props.pairingIncoming, props.pairingOutgoing])

  if (props.isBootstrappingAccount) {
    return (
      <section className="card v2-loading">
        <h2>Konto wird geladen…</h2>
        <p className="hint">Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.</p>
      </section>
    )
  }

  if (!hasIdentity) {
    return (
      <div className="v2-top">
        <section className="card v2-view">
          <h2>Willkommen</h2>

          {onboardPath === 'start' ? (
            <>
              <p className="hint v2-onboard-help">Start-Check: Hast du bereits ein Backup von deinem Konto?</p>
              <div className="row">
                <button
                  onClick={() => {
                    setOnboardError(null)
                    setOnboardPath('backup')
                  }}
                >
                  Ja, ich habe ein Backup
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setOnboardError(null)
                    setOnboardPath('new')
                  }}
                >
                  Nein, neues Konto
                </button>
              </div>
              <p className="hint">Hinweis: Fragen/Antworten sind Ende-zu-Ende verschlüsselt. Ohne Backup sind alte Daten nicht wiederherstellbar.</p>
            </>
          ) : null}

          {onboardPath === 'backup' ? (
            <>
              <p className="hint v2-onboard-help">
                Füge dein Backup-JSON ein und importiere es. Danach wird dein Konto automatisch geladen.
              </p>
              <label className="field">
                <span>Backup JSON</span>
                <textarea value={backupText} onChange={(e) => setBackupText(e.target.value)} placeholder='{"version": ...}' rows={8} />
              </label>
              <div className="row">
                <button
                  onClick={async () => {
                    const txt = backupText.trim()
                    if (!txt) {
                      setOnboardError('Bitte füge dein Backup-JSON ein.')
                      return
                    }
                    try {
                      JSON.parse(txt)
                    } catch {
                      setOnboardError('Ungültiges JSON. Bitte vollständiges Backup einfügen.')
                      return
                    }
                    try {
                      setOnboardError(null)
                      await props.onImportBackupText(txt)
                      setBackupText('')
                      setOnboardPath('start')
                      alert('Backup importiert und Konto geladen.')
                    } catch (e: unknown) {
                      setOnboardError(e instanceof Error ? e.message : String(e))
                    }
                  }}
                >
                  Importieren und prüfen
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setOnboardError(null)
                    setOnboardPath('start')
                  }}
                >
                  Zurück
                </button>
              </div>
              <p className="hint">Tipp: Vollständiges JSON einfügen, nicht gekürzt.</p>
            </>
          ) : null}

          {onboardPath === 'new' ? (
            <>
              <p className="hint v2-onboard-help">
                Erstelle ein neues Konto. Dein Nickname ist für Partner sichtbar, die deinen Code kennen.
              </p>
              <label className="field">
                <span>Nickname</span>
                <input value={props.nickname} onChange={(e) => props.onNicknameChange(e.target.value)} placeholder="z.B. Alex" />
              </label>
              <div className="row">
                <button
                  onClick={async () => {
                    try {
                      setOnboardError(null)
                      await props.onRegister()
                    } catch (e: unknown) {
                      setOnboardError(e instanceof Error ? e.message : String(e))
                    }
                  }}
                >
                  Konto erstellen
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setOnboardError(null)
                    setOnboardPath('start')
                  }}
                >
                  Zurück
                </button>
              </div>
              <p className="hint">Du kannst danach jederzeit ein Backup exportieren und auf anderen Geräten importieren.</p>
            </>
          ) : null}

          {onboardError ? <div className="inline-error">{onboardError}</div> : null}
        </section>
      </div>
    )
  }

  return (
    <section className="card v2-home">
      <div className="profile v2-profile">
        <div className="profile-head">
          <ProfileAvatar name={props.identity!.nickname} />
          <div>
            <div className="profile-name">{props.identity!.nickname}</div>
            <div className="hint">Dein Pairing-Code (teilen):</div>
          </div>
        </div>
        <div className="profile-code">{props.identity!.code ?? '—'}</div>
        <div className="row">
          <button
            className="secondary"
            onClick={async () => {
              if (!props.identity?.code) return
              await navigator.clipboard.writeText(props.identity.code)
              alert('Pairing-Code kopiert.')
            }}
          >
            Kopieren
          </button>
          <button className="secondary" onClick={props.onExportBackup}>
            Backup kopieren
          </button>
          <button
            className="secondary danger"
            onClick={async () => {
              if (!confirm('Account wirklich löschen? Dein Partner sieht dich dann als gelöscht und Interaktion ist nicht mehr möglich.')) return
              if (!confirm('Sicher? Ohne Backup sind alte Daten nicht wiederherstellbar.')) return
              await props.onDeleteAccount()
              alert('Account lokal gelöscht.')
            }}
          >
            Account löschen
          </button>
        </div>
        <div className="hint">
          Hinweis: Beide Partner müssen gegenseitig den Code eingeben und die Anfrage jeweils <b>annehmen</b>, damit eine Verknüpfung aktiv wird.
        </div>
      </div>

      {props.myPairs.length ? (
        <>
          <h2>Deine Partner</h2>
          <div className="pair-panel">
            <p className="hint">Wähle eine Verknüpfung aus, um direkt in die Fragen-Ansicht zu wechseln.</p>
            <div className="pair-cards">
              {props.myPairs.map((p) => (
                <button
                  key={p.id}
                  className="pair-card-btn"
                  onClick={async () => {
                    if (p.partnerDeleted) return
                    await props.onOpenPair(p.id)
                  }}
                  disabled={p.partnerDeleted}
                >
                  <div className="pair-card-main">
                    <ProfileAvatar name={p.partnerDeleted ? 'G' : p.partner?.nickname ?? '?'} />
                    <div>
                      <div className="pair-card-name">{p.partnerDeleted ? 'Gelöscht' : p.partner?.nickname ?? p.id}</div>
                      <div className="pair-card-code mono">{p.partnerDeleted ? '—' : p.partner?.code ?? '—'}</div>
                    </div>
                  </div>
                  <div className="pair-card-meta">
                    <div className={`pill mono status ${p.status === 'active' ? 'ok' : p.status === 'ended' ? 'ended' : 'pending'}`}>{p.status}</div>
                    <div className="hint">Öffnen →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="divider" />
        </>
      ) : null}

      <h2>Mit Partner verknüpfen</h2>
      <div className="pair-panel">
        <p className="hint">
          Gib den Code deines Partners ein und sende die Anfrage. Dein Partner muss sie annehmen. Danach muss dein Partner ebenfalls dir eine Anfrage senden und du musst annehmen.
        </p>
        <div className="row">
          <input
            value={partnerCodeInput}
            onChange={(e) => {
              props.onClearPairingInlineError()
              setPartnerCodeInput(e.target.value)
            }}
            placeholder="Partner-Code"
          />
          <button
            onClick={async () => {
              try {
                await props.onSendPairRequest(partnerCodeInput)
                setPartnerCodeInput('')
              } catch {
                // errors shown via global error panel
              }
            }}
          >
            Anfrage senden
          </button>
        </div>
      </div>
      {props.pairingInlineError ? <div className="inline-error">{props.pairingInlineError}</div> : null}

      <div className="divider" />
      <h2>Offene Verknüpfungs-Anfragen</h2>
      <div className="request-panel-list">
        {!groupedRequests.length ? <div className="empty">Keine offenen Anfragen.</div> : null}
        {groupedRequests.map((row) => (
          <div className="request request-panel" key={`${row.code}|${row.nickname}`}>
            <div className="row request-panel-head">
              <div className="request-user">
                <ProfileAvatar name={row.nickname} />
                <div>
                  <div className="pair-card-name">{row.nickname}</div>
                  <div className="pair-card-code mono">{row.code}</div>
                </div>
              </div>
            </div>
            <div className="row request-actions">
              {row.incomingIds.length ? (
                <>
                  <button className="action-accept" title="Anfrage annehmen und Verknüpfung bestätigen" onClick={() => props.onRespondPairing(row.incomingIds[0], 'accept')}>
                    ✓ Annehmen
                  </button>
                  <button className="action-reject" title="Anfrage ablehnen" onClick={() => props.onRespondPairing(row.incomingIds[0], 'reject')}>
                    ✕ Ablehnen
                  </button>
                </>
              ) : null}
              {row.outgoingIds.length ? (
                <button className="secondary action-cancel" title="Ausgehende Anfrage zurückziehen, wenn du diese Person nicht mehr hinzufügen möchtest" onClick={() => props.onRespondPairing(row.outgoingIds[0], 'cancel')}>
                  Zurückziehen
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
