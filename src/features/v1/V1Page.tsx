import { useCallback, useMemo, useState } from 'react'
import '../../styles/v1.css'
import { V1Footer } from './components/V1Footer'
import { V1Header } from './components/V1Header'
import type { PairingIncoming, PairingOutgoing, MyPairs } from '../../hooks/usePairing'
import type { AnswerChoice, DecryptedQuestion, PairView } from '../../types'

type V1PageProps = {
  identityUserId: string | null
  identityCode: string | null
  nickname: string
  onNicknameChange: (next: string) => void
  onRegister: () => Promise<void>
  onExportBackup: () => Promise<void>
  onImportBackup: () => Promise<void>

  pairingIncoming: PairingIncoming
  pairingOutgoing: PairingOutgoing
  myPairs: MyPairs
  onRefreshPairing: () => Promise<void>
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>
  onRespondPairing: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>

  pair: PairView | null
  onSelectPair: (pairId: string) => Promise<void>
  weeklyLimitInput: string
  onWeeklyLimitInputChange: (next: string) => void
  onProposeWeeklyLimit: () => Promise<void>
  onRespondWeeklyLimit: (action: 'accept' | 'reject' | 'cancel') => Promise<void>
  onUnpair: (pairId: string) => Promise<void>

  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  isPartnerAnswered: (questionId: string) => boolean
  onReloadQuestions: () => Promise<void>
  onAddQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>
  onDeleteQuestion: (questionId: string) => Promise<void>
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>

  answerLimitReached: boolean
  onAutoRefreshChange: (enabled: boolean) => void
  autoRefreshEnabled: boolean

  matches: Array<{ id: string; question: string; grade: 'perfect' | 'maybe' | 'ok'; answers: AnswerChoice[] }>
  onComputeMatches: () => Promise<void>

  onError: (message: string | null) => void
}

export function V1Page(props: V1PageProps) {
  const apiReady = !!props.identityUserId
  const [partnerCodeInput, setPartnerCodeInput] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [questionSelfAnswer, setQuestionSelfAnswer] = useState<AnswerChoice | null>(null)
  const [activeStep, setActiveStep] = useState<3 | 4 | 5>(3)

  const ownQuestions = useMemo(
    () => props.questions.filter((q) => q.createdBy === props.identityUserId),
    [props.identityUserId, props.questions],
  )

  const sortQuestions = useCallback(
    (a: DecryptedQuestion, b: DecryptedQuestion) => {
      const am = props.answerSummary[a.id]?.mine ? 1 : 0
      const bm = props.answerSummary[b.id]?.mine ? 1 : 0
      if (am !== bm) return am - bm
      return b.createdAt - a.createdAt
    },
    [props.answerSummary],
  )

  return (
    <div className="feature-shell v1-shell">
      <V1Header onExportBackup={props.onExportBackup} onImportBackup={props.onImportBackup} />
      <main className="grid">
      <section className="card">
        <h2>1) Account</h2>
        <p className="hint">Ohne E-Mail/Passwort. Dein Gerät hält die privaten Schlüssel. Backup ist wichtig.</p>
        <label className="field">
          <span>Nickname</span>
          <input value={props.nickname} onChange={(e) => props.onNicknameChange(e.target.value)} />
        </label>
        <div className="row">
          <button
            onClick={async () => {
              try {
                props.onError(null)
                await props.onRegister()
                await props.onRefreshPairing()
              } catch (e: unknown) {
                props.onError(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            Account erstellen / laden
          </button>
          <span className="mono">{props.identityUserId ? `userId: ${props.identityUserId}` : 'nicht registriert'}</span>
        </div>
        {props.identityCode ? (
          <div className="code-box">
            <div className="pair-label">Dein Pairing-Code</div>
            <div className="pair-code">{props.identityCode}</div>
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(props.identityCode!)
                  alert('Pairing-Code kopiert.')
                }}
              >
                Kopieren
              </button>
              <button className="secondary" onClick={props.onExportBackup}>
                Backup kopieren
              </button>
              <button className="secondary" onClick={props.onImportBackup}>
                Backup importieren
              </button>
            </div>
            <p className="hint">Gib diesen Code an den Partner. Fürs Pairing: beide geben den Code des anderen ein und akzeptieren dann.</p>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>2) Pairing</h2>
        <p className="hint">
          Multi-Pairing ist erlaubt. Sende eine Anfrage mit dem Code des Partners. Eingehende Anfragen kannst du annehmen oder ablehnen.
        </p>
        <div className="row">
          <input
            value={partnerCodeInput}
            onChange={(e) => setPartnerCodeInput(e.target.value)}
            placeholder="Partner-Code (z.B. K7M2P9QX)"
            disabled={!apiReady}
          />
          <button
            onClick={async () => {
              try {
                props.onError(null)
                await props.onSendPairRequest(partnerCodeInput)
                setPartnerCodeInput('')
              } catch (e: unknown) {
                props.onError(e instanceof Error ? e.message : String(e))
              }
            }}
            disabled={!apiReady}
          >
            Anfrage senden
          </button>
          <button
            className="secondary"
            onClick={async () => {
              try {
                props.onError(null)
                await props.onRefreshPairing()
              } catch (e: unknown) {
                props.onError(e instanceof Error ? e.message : String(e))
              }
            }}
            disabled={!apiReady}
          >
            Aktualisieren
          </button>
        </div>

        <div className="divider" />
        <div className="two-col">
          <div>
            <div className="pair-label">Eingehende Anfragen</div>
            <div className="request-list">
              {props.pairingIncoming.map((r) => (
                <div className="request" key={r.id}>
                  <div className="row">
                    <div className="mono">{r.from.nickname}</div>
                    <div className="pill mono">{r.from.code}</div>
                  </div>
                  <div className="row">
                    <button
                      onClick={async () => {
                        try {
                          props.onError(null)
                          await props.onRespondPairing(r.id, 'accept')
                        } catch (e: unknown) {
                          props.onError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                      disabled={!apiReady}
                    >
                      Annehmen
                    </button>
                    <button
                      className="secondary"
                      onClick={async () => {
                        try {
                          props.onError(null)
                          await props.onRespondPairing(r.id, 'reject')
                        } catch (e: unknown) {
                          props.onError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                      disabled={!apiReady}
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
              {!props.pairingIncoming.length ? <div className="empty">Keine.</div> : null}
            </div>
          </div>
          <div>
            <div className="pair-label">Ausgehende Anfragen</div>
            <div className="request-list">
              {props.pairingOutgoing.map((r) => (
                <div className="request" key={r.id}>
                  <div className="row">
                    <div className="mono">{r.to.nickname}</div>
                    <div className="pill mono">{r.to.code}</div>
                  </div>
                  <div className="row">
                    <button
                      className="secondary"
                      onClick={async () => {
                        try {
                          props.onError(null)
                          await props.onRespondPairing(r.id, 'cancel')
                        } catch (e: unknown) {
                          props.onError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                      disabled={!apiReady}
                    >
                      Zurückziehen
                    </button>
                  </div>
                </div>
              ))}
              {!props.pairingOutgoing.length ? <div className="empty">Keine.</div> : null}
            </div>
          </div>
        </div>

        <div className="divider" />
        <div className="pair-label">Deine Paare</div>
        <div className="pair-list">
          {props.myPairs.map((p) => (
            <button
              key={p.id}
              className={`pair-item secondary ${props.pair?.id === p.id ? 'active' : ''}`}
              onClick={async () => {
                try {
                  props.onError(null)
                  await props.onSelectPair(p.id)
                } catch (e: unknown) {
                  props.onError(e instanceof Error ? e.message : String(e))
                }
              }}
              disabled={!apiReady}
              title="Pair auswählen"
            >
              <div className="row">
                <div className="mono">{p.partner ? p.partner.nickname : '—'}</div>
                <div className="pill mono">{p.status}</div>
                {p.partner?.code ? <div className="pill mono">{p.partner.code}</div> : null}
              </div>
            </button>
          ))}
          {!props.myPairs.length ? <div className="empty">Noch keine Paare.</div> : null}
        </div>

        {props.pair?.id ? (
          <div className="pair-box">
            <div className="row">
              <div>
                <div className="pair-label">Pair-ID</div>
                <div className="pair-id mono">{props.pair.id}</div>
              </div>
              <div className="pill">{props.pair.status}</div>
            </div>
            <div className="two-col">
              <div>
                <div className="pair-label">Du</div>
                <div className="mono">{props.pair.me.nickname}</div>
              </div>
              <div>
                <div className="pair-label">Partner</div>
                <div className="mono">{props.pair.partner ? props.pair.partner.nickname : '—'}</div>
              </div>
            </div>

            <div className="divider" />
            <div className="row">
              <label className="field inline">
                <span>Wochenlimit</span>
                <input value={props.weeklyLimitInput} onChange={(e) => props.onWeeklyLimitInputChange(e.target.value)} />
              </label>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    props.onError(null)
                    await props.onProposeWeeklyLimit()
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!apiReady}
              >
                Vorschlagen
              </button>
              {props.pair.weeklyLimitPending ? (
                props.pair.weeklyLimitPending.proposedBy === props.identityUserId ? (
                  <span className="hint">Vorschlag offen: {props.pair.weeklyLimitPending.limit} (wartet auf Partner)</span>
                ) : (
                  <div className="row">
                    <span className="hint">Partner schlägt {props.pair.weeklyLimitPending.limit} vor.</span>
                    <button
                      onClick={async () => {
                        try {
                          props.onError(null)
                          await props.onRespondWeeklyLimit('accept')
                        } catch (e: unknown) {
                          props.onError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                      disabled={!apiReady}
                    >
                      Annehmen
                    </button>
                    <button
                      className="secondary"
                      onClick={async () => {
                        try {
                          props.onError(null)
                          await props.onRespondWeeklyLimit('reject')
                        } catch (e: unknown) {
                          props.onError(e instanceof Error ? e.message : String(e))
                        }
                      }}
                      disabled={!apiReady}
                    >
                      Ablehnen
                    </button>
                  </div>
                )
              ) : null}
              <button
                className="secondary"
                onClick={async () => {
                  if (!confirm('Pair wirklich lösen?')) return
                  if (!props.pair) return
                  try {
                    props.onError(null)
                    await props.onUnpair(props.pair.id)
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!apiReady}
              >
                Pair lösen
              </button>
            </div>
            <p className="hint">Aktiv, sobald beide Partner denselben Wert vorschlagen.</p>
          </div>
        ) : null}
      </section>

      <section className="card wide">
        <h2>3) Fragen (verschlüsselt)</h2>
        <p className="hint">Der Server speichert nur Ciphertext. Entschlüsselung passiert nur bei dir und deinem Partner.</p>
        <div className="step-tabs">
          <button className={`tab ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(3)}>
            3) Fragen
          </button>
          <button className={`tab ${activeStep === 4 ? 'active' : ''}`} onClick={() => setActiveStep(4)} disabled={!props.pair || props.pair.status !== 'active'}>
            4) Spielen
          </button>
          <button className={`tab ${activeStep === 5 ? 'active' : ''}`} onClick={() => setActiveStep(5)} disabled={!props.pair || props.pair.status !== 'active'}>
            5) Auswertung
          </button>
        </div>

        <div className="row">
          <label className="toggle">
            <input type="checkbox" checked={props.autoRefreshEnabled} onChange={(e) => props.onAutoRefreshChange(e.target.checked)} />
            <span>Auto-Refresh</span>
          </label>
          <span className="hint">lädt nur Pairing-Status alle 5s neu (keine Fragen/Antworten)</span>
        </div>

        {activeStep === 3 ? (
          <>
            <div className="row">
              <input
                className="grow"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Neue Frage hinzufügen…"
                disabled={!props.pair || props.pair.status !== 'active'}
              />
              <div className="segmented">
                <button
                  type="button"
                  className={`seg ${questionSelfAnswer === 'yes' ? 'active' : ''}`}
                  onClick={() => setQuestionSelfAnswer('yes')}
                  disabled={!props.pair || props.pair.status !== 'active'}
                  title="Deine Antwort: Ja"
                >
                  Ja
                </button>
                <button
                  type="button"
                  className={`seg ${questionSelfAnswer === 'maybe' ? 'active' : ''}`}
                  onClick={() => setQuestionSelfAnswer('maybe')}
                  disabled={!props.pair || props.pair.status !== 'active'}
                  title="Deine Antwort: Vielleicht"
                >
                  Vielleicht
                </button>
                <button
                  type="button"
                  className={`seg ${questionSelfAnswer === 'no' ? 'active' : ''}`}
                  onClick={() => setQuestionSelfAnswer('no')}
                  disabled={!props.pair || props.pair.status !== 'active'}
                  title="Deine Antwort: Nein"
                >
                  Nein
                </button>
              </div>
              <button
                onClick={async () => {
                  if (!questionText.trim() || !questionSelfAnswer) return
                  try {
                    props.onError(null)
                    await props.onAddQuestion(questionText, questionSelfAnswer)
                    setQuestionText('')
                    setQuestionSelfAnswer(null)
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!props.pair || props.pair.status !== 'active' || !questionText.trim() || !questionSelfAnswer}
              >
                Frage stellen
              </button>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    props.onError(null)
                    await props.onReloadQuestions()
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!props.pair}
              >
                Aktualisieren
              </button>
            </div>

            <div className="question-list">
              {ownQuestions
                .slice()
                .sort(sortQuestions)
                .map((q) => (
                  <div className={`question ${props.answerSummary[q.id]?.mine ? 'answered' : ''}`} key={q.id}>
                    <div className="q-meta">
                      <span className="mono">{new Date(q.createdAt).toLocaleString()}</span>
                      <span className="mono">von dir</span>
                    </div>
                    <div className="q-text">{q.text}</div>
                    <div className="row">
                      <div className="hint mono grow">
                        Antworten: {props.answerSummary[q.id]?.total ?? 0}/2{' '}
                        {props.answerSummary[q.id]?.mine ? `• du: ${props.answerSummary[q.id]?.mine}` : ''}
                      </div>
                      {q.createdBy === props.identityUserId && !props.isPartnerAnswered(q.id) ? (
                        <button
                          className="secondary"
                          onClick={async () => {
                            if (!confirm('Frage wirklich löschen? (nur möglich, solange dein Partner noch nicht geantwortet hat)')) return
                            try {
                              props.onError(null)
                              await props.onDeleteQuestion(q.id)
                            } catch (e: unknown) {
                              props.onError(e instanceof Error ? e.message : String(e))
                            }
                          }}
                        >
                          Löschen
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              {props.pair && ownQuestions.length === 0 ? <div className="empty">Du hast noch keine eigenen Fragen gestellt.</div> : null}
            </div>
          </>
        ) : null}

        {activeStep === 4 ? (
          <>
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    props.onError(null)
                    await props.onReloadQuestions()
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!props.pair}
              >
                Aktualisieren
              </button>
              <span className="hint">Du siehst nur deinen eigenen Antwort-Status. Partner-Antworten werden nicht angezeigt.</span>
            </div>
            {props.answerLimitReached ? (
              <div className="notice">
                Wochenlimit fürs Antworten erreicht. Du kannst weiterhin deine eigenen Fragen beantworten, aber keine weiteren Partner-Fragen diese Woche.
              </div>
            ) : null}
            <div className="question-list">
              {props.questions
                .slice()
                .sort(sortQuestions)
                .map((q) => {
                  const mine = props.answerSummary[q.id]?.mine
                  const answered = !!mine
                  const canAnswer = !answered && (!props.answerLimitReached || q.createdBy === props.identityUserId)
                  return (
                    <div className={`question ${answered ? 'answered' : ''}`} key={q.id}>
                      <div className="q-meta">
                        <span className="mono">{new Date(q.createdAt).toLocaleString()}</span>
                        <span className="mono">
                          Antworten: {props.answerSummary[q.id]?.total ?? 0}/2 {answered ? `• du: ${mine}` : '• du: —'}
                        </span>
                      </div>
                      <div className="q-text">{q.text}</div>
                      <div className="row">
                        <button
                          className="choice"
                          onClick={async () => {
                            try {
                              props.onError(null)
                              await props.onAnswer(q.id, 'yes')
                            } catch (e: unknown) {
                              props.onError(e instanceof Error ? e.message : String(e))
                            }
                          }}
                          disabled={!props.pair || props.pair.status !== 'active' || !canAnswer}
                        >
                          Ja
                        </button>
                        <button
                          className="choice secondary"
                          onClick={async () => {
                            try {
                              props.onError(null)
                              await props.onAnswer(q.id, 'maybe')
                            } catch (e: unknown) {
                              props.onError(e instanceof Error ? e.message : String(e))
                            }
                          }}
                          disabled={!props.pair || props.pair.status !== 'active' || !canAnswer}
                        >
                          Vielleicht
                        </button>
                        <button
                          className="choice danger"
                          onClick={async () => {
                            try {
                              props.onError(null)
                              await props.onAnswer(q.id, 'no')
                            } catch (e: unknown) {
                              props.onError(e instanceof Error ? e.message : String(e))
                            }
                          }}
                          disabled={!props.pair || props.pair.status !== 'active' || !canAnswer}
                        >
                          Nein
                        </button>
                        {q.createdBy === props.identityUserId && !props.isPartnerAnswered(q.id) ? (
                          <button
                            className="secondary"
                            onClick={async () => {
                              if (!confirm('Frage wirklich löschen? (nur möglich, solange dein Partner noch nicht geantwortet hat)')) return
                              try {
                                props.onError(null)
                                await props.onDeleteQuestion(q.id)
                              } catch (e: unknown) {
                                props.onError(e instanceof Error ? e.message : String(e))
                              }
                            }}
                            disabled={!props.pair || props.pair.status !== 'active'}
                          >
                            Löschen
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              {props.pair && props.questions.length === 0 ? <div className="empty">Noch keine Fragen.</div> : null}
            </div>
          </>
        ) : null}

        {activeStep === 5 ? (
          <>
            <div className="divider" />
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    props.onError(null)
                    await props.onComputeMatches()
                  } catch (e: unknown) {
                    props.onError(e instanceof Error ? e.message : String(e))
                  }
                }}
                disabled={!props.pair}
              >
                Matches auswerten
              </button>
              <span className="hint">Es werden nur Fragen angezeigt, bei denen niemand „Nein“ gesagt hat.</span>
            </div>
            {props.matches.length ? (
              <div className="match-grid">
                {props.matches.map((m, idx) => (
                  <div className={`match-card ${m.grade}`} key={`${m.question}-${idx}`}>
                    <div className="match-head">
                      <div className="match-title">{m.question}</div>
                      <div className={`badge ${m.grade}`}>{m.grade === 'perfect' ? '💜 Perfekt' : m.grade === 'maybe' ? '🟣 Vielleicht' : '⚪ Okay'}</div>
                    </div>
                    <div className="match-answers">
                      {m.answers.map((a, i) => (
                        <span className={`answer-pill ${a}`} key={i}>
                          {a === 'yes' ? 'Ja' : a === 'maybe' ? 'Vielleicht' : 'Nein'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : props.pair ? (
              <div className="empty">Noch keine Matches (oder noch nicht beide geantwortet).</div>
            ) : null}
          </>
        ) : null}
      </section>
      </main>
      <V1Footer />
    </div>
  )
}
