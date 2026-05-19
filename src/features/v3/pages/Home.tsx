import { useMemo, useRef, useState } from 'react'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import type { PairingIncoming, PairingOutgoing, MyPairs } from '../../../hooks/usePairing'
import { OnboardingStepper } from '../components/OnboardingStepper'
import { goV3Onboarding } from '../../../app/routes'
import { V3Notice } from '../components/V3Notice'
import { InfoIcon } from '../components/icons/InfoIcon'
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from '../lib/backup'
import { toUserMessage } from '../lib/errors'

type HomePageProps = {
  isBootstrappingAccount: boolean
  identity: { userId: string; nickname: string; code?: string | null } | null
  nickname: string
  onNicknameChange: (next: string) => void
  onRegister: () => Promise<void>
  onBootstrap: () => Promise<unknown>
  onImportBackupText: (txt: string) => Promise<void>
  onExportBackupText: () => Promise<string>
  onboardingStep: 'start' | 'backup' | 'new' | 'backup-save'

  myPairs: MyPairs
  pairingIncoming: PairingIncoming
  pairingOutgoing: PairingOutgoing
  pairingInlineError: string | null
  onClearPairingInlineError: () => void
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>
  onRespondPairing: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>
  onOpenPair: (pairId: string) => Promise<void>
}

function CodeExchangeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-guide-icon" aria-hidden="true">
      <path
        d="M9 7H6.2C5 7 4 8 4 9.2v2.6C4 13 5 14 6.2 14H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 10h2.8c1.2 0 2.2 1 2.2 2.2v2.6C20 16 19 17 17.8 17H15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4l-1.6 1.6M12 4l1.6 1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 20l-1.6-1.6M12 20l1.6-1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7.3 10.2l1.7 1.8-1.7 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.7 13.8 15 12l1.7-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
  const el = ref.current
  if (!el) return
  // Prefer scrollIntoView so it works with scroll containers (not only window).
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  } catch {
    // fall back to window scrolling
  }
  const top = el.getBoundingClientRect().top + window.scrollY - 92
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

export function HomePage(props: HomePageProps) {
  const onboardPath: 'start' | 'backup' | 'new' | 'backup-save' = props.onboardingStep ?? 'start'
  const [backupText, setBackupText] = useState('')
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [backupFileName, setBackupFileName] = useState<string | null>(null)
  const [onboardError, setOnboardError] = useState<string | null>(null)
  const [partnerCodeInput, setPartnerCodeInput] = useState('')
  const backupFileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const hasIdentity = !!props.identity?.userId

  function setOnboardingStep(step: 'start' | 'backup' | 'new' | 'backup-save') {
    goV3Onboarding(step)
  }

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

  const requestsPanelRef = useRef<HTMLElement | null>(null)

  if (props.isBootstrappingAccount) {
    return (
      <section className="card v3-card v3-view">
        <h2>Konto wird geladen…</h2>
        <p className="hint">Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.</p>
      </section>
    )
  }

  const showOnboarding = !hasIdentity || onboardPath !== 'start'

  if (showOnboarding) {
    const isNewFlow = onboardPath === 'new' || onboardPath === 'backup-save'

    const steps = isNewFlow
      ? [
          { id: 'choose', title: 'Start', subtitle: 'Backup importieren oder neues Konto' },
          { id: 'new', title: 'Neues Konto', subtitle: 'Nickname festlegen' },
          { id: 'backup', title: 'Backup', subtitle: 'Optional herunterladen' },
          { id: 'ready', title: 'Fertig', subtitle: 'Partner verknüpfen und loslegen' },
        ]
      : [
          { id: 'choose', title: 'Start', subtitle: 'Backup importieren oder neues Konto' },
          {
            id: 'setup',
            title: onboardPath === 'backup' ? 'Backup importieren' : 'Einrichten',
            subtitle: onboardPath === 'backup' ? 'Backup importieren' : 'Backup importieren oder neues Konto',
          },
          { id: 'ready', title: 'Fertig', subtitle: 'Partner verknüpfen und loslegen' },
        ]

    const activeStepId =
      onboardPath === 'start'
        ? 'choose'
        : onboardPath === 'backup'
          ? 'setup'
          : onboardPath === 'new'
            ? 'new'
            : onboardPath === 'backup-save'
              ? 'backup'
              : 'setup'

    async function importBackupText(txt: string) {
      const trimmed = txt.trim()
      if (!trimmed) {
        setOnboardError('Bitte lade eine Backup-Datei hoch oder füge dein Backup-JSON ein.')
        return
      }
      try {
        JSON.parse(trimmed)
      } catch {
        setOnboardError('Der eingefügte Text ist kein valides Backup (ungültiges JSON).')
        return
      }
      try {
        setOnboardError(null)
        await props.onImportBackupText(trimmed)
        setBackupText('')
        setBackupFile(null)
        setBackupFileName(null)
        if (backupFileInputRef.current) backupFileInputRef.current.value = ''
        setOnboardingStep('start')
      } catch (e: unknown) {
        setOnboardError(toUserMessage(e))
      }
    }

    async function importBackupFile(file: File) {
      try {
        const txt = (await file.text()).trim()
        if (!txt) {
          setOnboardError('Die Datei ist leer und keine valide Backup-Datei.')
          return
        }
        try {
          JSON.parse(txt)
        } catch {
          setOnboardError('Die Datei konnte nicht gelesen werden oder ist keine valide Backup-Datei.')
          return
        }
        await importBackupText(txt)
      } catch (e: unknown) {
        setOnboardError(toUserMessage(e))
      }
    }

    function clearBackupFileSelection() {
      setBackupFile(null)
      setBackupFileName(null)
      if (backupFileInputRef.current) backupFileInputRef.current.value = ''
    }

    return (
      <section className="card v3-card v3-view">
        <h2 className="v3-welcome-title">Willkommen</h2>
        <OnboardingStepper steps={steps} activeStepId={activeStepId} />
        <div className="divider v3-welcome-divider" />
        {onboardPath === 'start' ? (
          <>
            <p className="v3-onboard-question">Hast du bereits ein Backup von deinem Konto?</p>
            <div className="v3-onboard-choice-row">
              <button
                className="secondary v3-onboard-choice"
                onClick={() => {
                  setOnboardError(null)
                  setBackupText('')
                  clearBackupFileSelection()
                  setOnboardingStep('backup')
                }}
              >
                Ja, ich habe ein Backup
              </button>
              <button
                className="secondary v3-onboard-choice"
                onClick={() => {
                  setOnboardError(null)
                  setOnboardingStep('new')
                }}
              >
                Nein, neues Konto
              </button>
            </div>
          </>
        ) : null}

        {onboardPath === 'backup' ? (
          <>
            <p className="v3-onboard-question">Lade ein bestehendes Backup als Datei hoch, oder füge deinen Backup-Text in die Textbox ein.</p>

            <div className="v3-import-panel">
              <div className="v3-import-col">
                <div className="v3-import-heading">Backup via Datei</div>
                <input
                  ref={backupFileInputRef}
                  className="v3-import-file-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null
                    if (!file) {
                      clearBackupFileSelection()
                      return
                    }
                    setOnboardError(null)
                    setBackupFile(file)
                    setBackupFileName(file.name)
                  }}
                />
                <div className="v3-import-file-row">
                  <button type="button" className="secondary" onClick={() => backupFileInputRef.current?.click()}>
                    Backup-Datei auswählen
                  </button>
                  {backupFileName ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setOnboardError(null)
                        clearBackupFileSelection()
                      }}
                    >
                      Auswahl löschen
                    </button>
                  ) : null}
                </div>
                {backupFileName ? <div className="hint">Ausgewählt: {backupFileName}</div> : <div className="hint">Wähle die Backup .json Datei aus</div>}
              </div>

              <div className="v3-import-col">
                <div className="v3-import-heading">Backup über Text</div>
                <label className="field v3-field">
                  <textarea value={backupText} onChange={(e) => setBackupText(e.target.value)} placeholder='{"version": ...}' rows={10} />
                </label>
                <div className="hint">Kopiere dein Backup-JSON-Text in die Textbox.</div>
              </div>
            </div>

            <div className="row">
              <button
                className="primary"
                onClick={async () => {
                  if (backupFile) {
                    await importBackupFile(backupFile)
                    return
                  }
                  await importBackupText(backupText)
                }}
              >
                Importieren und prüfen
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setOnboardError(null)
                  setBackupText('')
                  clearBackupFileSelection()
                  setOnboardingStep('start')
                }}
              >
                Zurück
              </button>
            </div>
          </>
        ) : null}

        {onboardPath === 'new' ? (
          <>
            <p className="v3-onboard-question">Erstelle ein neues Konto</p>
            <p className="hint">Dein Nickname ist für Partner sichtbar, die deinen Pairing-Code kennen.</p>

              <div className="v3-onboard-form">
                <label className="field v3-field">
                  <span>Nickname</span>
                  <input
                    value={props.nickname}
                    onChange={(e) => props.onNicknameChange(e.target.value)}
                    placeholder="z.B. Alex"
                    maxLength={30}
                    required
                  />
                </label>
                <p className="hint">
                  Deine Account-Daten (inkl. Schlüssel) werden lokal auf diesem Gerät gespeichert. Fragen und Antworten werden auf deinem Gerät verschlüsselt und nur verschlüsselt auf dem Server gespeichert.
                </p>
                <div className="row">
                  <button
                    className="primary"
                    onClick={async () => {
                      const trimmed = props.nickname.trim()
                      if (!trimmed) {
                        setOnboardError('Bitte gib einen Nickname ein.')
                        return
                      }
                      try {
                        setIsRegistering(true)
                        await props.onRegister()
                        setOnboardError(null)
                        const hydrated = (await props.onBootstrap()) as any
                        if (!hydrated?.userId) {
                          setOnboardError('Konto wurde erstellt, konnte aber noch nicht geladen werden. Bitte erneut versuchen.')
                          return
                        }
                        setOnboardingStep('backup-save')
                       } catch (e: unknown) {
                         setOnboardError(toUserMessage(e))
                       } finally {
                         setIsRegistering(false)
                       }
                     }}
                    disabled={!props.nickname.trim() || isRegistering}
                  >
                    Konto erstellen
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setOnboardError(null)
                      setOnboardingStep('start')
                    }}
                    disabled={isRegistering}
                  >
                    Zurück
                  </button>
                </div>
                <p className="hint">Du kannst danach jederzeit ein Backup erstellen und auf anderen Geräten importieren.</p>
              </div>
          </>
        ) : null}

        {onboardPath === 'backup-save' ? (
          <>
            <p className="v3-onboard-question">Backup anlegen (optional)</p>
            <p className="hint">Du kannst jetzt direkt ein Backup als Datei herunterladen. So kannst du dein Konto später auf einem anderen Gerät wiederherstellen.</p>

            <div className="row">
              <button
                className="secondary"
                disabled={isDownloadingBackup}
                onClick={async () => {
                  try {
                    setOnboardError(null)
                    setIsDownloadingBackup(true)
                    const txt = await props.onExportBackupText()
                    const formatted = formatJsonMaybe(txt)
                    const filename = safeBackupFilename(props.identity?.code ?? 'backup')
                    downloadTextFile({ filename, content: formatted })
                  } catch (e: unknown) {
                    setOnboardError(toUserMessage(e))
                  } finally {
                    setIsDownloadingBackup(false)
                  }
                }}
              >
                Backup herunterladen
              </button>
              <button
                className="primary"
                onClick={async () => {
                  setOnboardError(null)
                  try {
                    const hydrated = (await props.onBootstrap()) as any
                    if (!hydrated?.userId) {
                      setOnboardError('Konto konnte nicht geladen werden. Bitte kurz warten und erneut versuchen.')
                      return
                    }
                  } catch (e: unknown) {
                    setOnboardError(e instanceof Error ? e.message : String(e))
                    return
                  }
                  setOnboardingStep('start')
                }}
              >
                Fertigstellen
              </button>
            </div>
            {isDownloadingBackup ? <div className="hint">Download wird vorbereitet…</div> : null}
          </>
        ) : null}

        {onboardError ? <div className="inline-error">{onboardError}</div> : null}
      </section>
    )
  }

  const visiblePairs = props.myPairs.filter((p) => !p.partnerDeleted)
  const hasPairs = visiblePairs.length > 0
  const hasRequests = groupedRequests.length > 0

  return (
    <div className="v3-home-stack">
      {hasRequests ? (
        <V3Notice
          icon={<InfoIcon />}
          title="Offene Verknüpfungen vorhanden"
          hint="Tippe hier, um die Anfragen anzusehen."
          onClick={() => scrollToSection(requestsPanelRef)}
        />
      ) : null}

      {hasPairs ? (
        <section className="card v3-card v3-panel">
          <h2>Deine Partner</h2>
          <p className="hint">Du hast bereits folgende verknüpfte Partner. Tippe auf einen Partner, um die Fragen zu öffnen.</p>
          <div className="v3-pair-grid">
            {visiblePairs.map((p) => (
              <button
                key={p.id}
                className="v3-pair-card"
                onClick={async () => {
                  await props.onOpenPair(p.id)
                }}
              >
                <div className="v3-pair-card-main">
                  <ProfileAvatar name={p.partner?.nickname ?? '?'} />
                  <div>
                    <div className="v3-pair-card-name">{p.partner?.nickname ?? p.id}</div>
                    <div className="v3-pair-card-code mono">{p.partner?.code ?? '—'}</div>
                  </div>
                </div>
                <div className={`pill mono status ${p.status === 'active' ? 'ok' : p.status === 'ended' ? 'ended' : 'pending'}`}>
                  {p.partnerDeleted ? 'gelöscht' : p.status === 'active' ? 'aktiv' : p.status === 'ended' ? 'beendet' : 'ausstehend'}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!hasPairs ? (
        <section className="card v3-card v3-panel v3-guide">
          <div className="v3-guide-head">
            <CodeExchangeIcon />
            <div className="v3-guide-text">
              <h2>So verknüpft ihr euch</h2>
              <p className="hint">Ihr müsst eure Pairing-Codes gegenseitig austauschen und beide Anfragen annehmen.</p>
            </div>
          </div>
          <ol className="v3-guide-steps">
            <li>
              Frag deinen Partner nach seinem <strong>Pairing-Code</strong>.
            </li>
            <li>
              Teile deinem Partner deinen <strong>Pairing-Code</strong> ({props.identity?.code ?? '—'}) mit.
            </li>
            <li>
              Ihr sendet euch <strong>beide</strong> eine Anfrage und nehmt sie jeweils an. Erst dann wird die Verknüpfung aktiv.
            </li>
            <li>Wenn ihr verbunden seid, könnt ihr euch gegenseitig Fragen ausspielen und Antworten sehen.</li>
          </ol>
        </section>
      ) : null}

      <section className="card v3-card v3-panel">
        <h2>Mit Partner verknüpfen</h2>
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
            className="primary"
            disabled={!partnerCodeInput.trim()}
            onClick={async () => {
              await props.onSendPairRequest(partnerCodeInput)
              setPartnerCodeInput('')
            }}
          >
            Anfrage senden
          </button>
        </div>
        {props.pairingInlineError ? <div className="inline-error">{props.pairingInlineError}</div> : null}
      </section>

      <section ref={requestsPanelRef} className="card v3-card v3-panel">
        <h2>Offene Verknüpfungsanfragen</h2>
        {!groupedRequests.length ? <div className="empty">Keine offenen Anfragen.</div> : null}
        <div className="v3-request-list">
          {groupedRequests.map((row) => (
            <div className="v3-request" key={`${row.code}|${row.nickname}`}>
              <div className="v3-request-head">
                <ProfileAvatar name={row.nickname} />
                <div className="v3-request-meta">
                  <div className="v3-request-name">{row.nickname}</div>
                  <div className="mono v3-request-code">{row.code}</div>
                </div>
              </div>
              <div className="v3-request-actions">
                {row.incomingIds.length ? (
                  <>
                    <button className="secondary" onClick={() => props.onRespondPairing(row.incomingIds[0], 'accept')}>
                      <span className="v3-action-ok">✓</span> Annehmen
                    </button>
                    <button className="secondary" onClick={() => props.onRespondPairing(row.incomingIds[0], 'reject')}>
                      <span className="v3-action-bad">✕</span> Ablehnen
                    </button>
                  </>
                ) : null}
                {row.outgoingIds.length ? (
                  <button className="secondary" onClick={() => props.onRespondPairing(row.outgoingIds[0], 'cancel')}>
                    Zurückziehen
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
