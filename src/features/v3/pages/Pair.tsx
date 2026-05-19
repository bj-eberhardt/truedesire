import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MatchVisibilityIcon } from '../../../components/MatchVisibilityIcon'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import { RefreshButton } from '../../../components/RefreshButton'
import type { MatchView } from '../../../hooks/useMatches'
import type { AnswerChoice, DecryptedQuestion, PairView } from '../../../types'
import { goV3Pair, goV3PairMatches, goV3PairSettings } from '../../../app/routes'

function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toLocaleDateString()
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-limit-notice-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-notice-icon" aria-hidden="true">
      <path
        d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13.2a7.9 7.9 0 0 0 .05-1.2 7.9 7.9 0 0 0-.05-1.2l2-1.55-1.9-3.29-2.42.97a8.1 8.1 0 0 0-2.08-1.2L14.6 2h-3.8l-.4 2.73a8.1 8.1 0 0 0-2.08 1.2L5.9 4.96 4 8.25l2 1.55A7.9 7.9 0 0 0 6 12c0 .4.02.8.05 1.2L4 14.75l1.9 3.29 2.42-.97c.63.5 1.33.9 2.08 1.2L10.8 22h3.8l.4-2.73c.75-.3 1.45-.7 2.08-1.2l2.42.97 1.9-3.29-2-1.55Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavBackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-nav-icon" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavNextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-nav-icon" aria-hidden="true">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type PairPageProps = {
  pairId: string
  activeTab: 'play' | 'matches' | 'settings'
  identityUserId: string
  pair: PairView | null
  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  isLoadingPairData: boolean
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>
  onAnswerBegin: () => void
  onAnswerAbort: () => void
  onAnswerSaved: () => void

  cardIndex: number
  onSetCardIndex: (idx: number) => void

  onBack: () => void
  onRefreshView: () => Promise<void>
  onGoAsk: () => void
  onGoPlayed: () => void

  matches: MatchView[]
  isLoadingMatches: boolean
  onComputeMatches: () => Promise<void>
  hiddenMatchIds: string[]
  setHiddenMatchIds: (fn: (prev: string[]) => string[]) => void
  showHiddenMatches: boolean
  setShowHiddenMatches: (fn: (prev: boolean) => boolean) => void

  visibleMatchesCount: number

  weeklyLimitInput: string
  setWeeklyLimitInput: (v: string) => void
  allowAllQuestions: boolean
  setAllowAllQuestions: (v: boolean) => void
  isLoadingGroupSettings: boolean
  onRefreshGroupSettings: () => Promise<void>
  onProposeGroupSettings: () => Promise<void>
  onRespondGroupSettings: (action: 'accept' | 'reject' | 'cancel') => Promise<void>
}

export function PairPage(props: PairPageProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [savedQuestionText, setSavedQuestionText] = useState<string | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const swipeRef = useRef<{ pointerId: number | null; startX: number; startY: number; moved: boolean }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    moved: false,
  })

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    }
  }, [])

  const hiddenCount = useMemo(() => props.matches.filter((m) => props.hiddenMatchIds.includes(m.id)).length, [props.hiddenMatchIds, props.matches])

  const showHiddenMatchesDisabled = hiddenCount === 0

  const canProposeSettings = useMemo(() => {
    if (!props.pair) return false
    if (props.pair.weeklyLimitPending) return false
    if (props.isLoadingGroupSettings) return false
    const nextLimit = props.allowAllQuestions ? 0 : Number(props.weeklyLimitInput)
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || nextLimit > 50) return false
    const currentLimit = props.pair.usage?.weeklyLimit ?? props.pair.weeklyLimit
    if (nextLimit === currentLimit) return false
    return true
  }, [props.allowAllQuestions, props.isLoadingGroupSettings, props.pair, props.weeklyLimitInput])

  if (!props.pair || props.pair.id !== props.pairId) {
    return (
      <section className="card v3-card">
        <div className="row">
          <button className="secondary" onClick={props.onBack} title="Zurück zur Partnerübersicht">
            ← Zurück
          </button>
          <RefreshButton onClick={props.onRefreshView} disabled title="Ansicht neu laden" />
          <button className="primary" disabled>
            Eine Frage stellen
          </button>
        </div>
        <div className="empty" style={{ width: '100%' }}>
          Verknüpfung wird geladen…
        </div>
      </section>
    )
  }

  const pair = props.pair

  const weeklyLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
  const isUnlimited = weeklyLimit === 0
  const answeredThisWeek = pair.usage?.answeredThisWeek ?? 0
  const remainingNew = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, weeklyLimit - answeredThisWeek)
  const remainingNewCount = isUnlimited ? null : Math.max(0, weeklyLimit - answeredThisWeek)
  const pendingSettingsCount = pair.weeklyLimitPending ? 1 : 0

  const baseOpen = props.questions.slice().filter((q) => (props.answerSummary[q.id]?.total ?? 0) < 2)
  const unansweredAll = baseOpen.filter((q) => !props.answerSummary[q.id]?.mine)
  const openNonOwn = unansweredAll.filter((q) => q.createdBy !== props.identityUserId).length
  const playedPending = baseOpen.filter((q) => !!props.answerSummary[q.id]?.mine)

  const unanswered = remainingNew > 0 ? unansweredAll : unansweredAll.filter((q) => q.createdBy === props.identityUserId)
  const ordered = unanswered.sort((a, b) => b.createdAt - a.createdAt)

  const safeIndex = Math.min(props.cardIndex, Math.max(0, ordered.length - 1))
  const q = ordered[safeIndex]
  const canAnswerNew = q ? q.createdBy === props.identityUserId || remainingNew > 0 : false

  const showLimitNotice = !isUnlimited && remainingNew === 0 && openNonOwn > 0
  const allCurrentAnswered = props.questions.length > 0 && unansweredAll.length === 0 && openNonOwn === 0
  const limitNoticeText =
    openNonOwn > 0
      ? `Wochenlimit erreicht. Ab ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten. Es warten dann noch ${openNonOwn} offene Fragen auf dich.`
      : `Wochenlimit erreicht. Ab ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten.`

  const showPlay = props.activeTab === 'play'
  const showMatches = props.activeTab === 'matches'
  const showSettings = props.activeTab === 'settings'

  function canSwipeTarget(el: EventTarget | null): boolean {
    const node = el as HTMLElement | null
    if (!node) return true
    const tag = node.tagName?.toLowerCase?.() ?? ''
    if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'a') return false
    if (node.closest?.('button, a, input, textarea, select, label')) return false
    return true
  }

  function onSwipePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse') return
    if (!canSwipeTarget(e.target)) return
    swipeRef.current.pointerId = e.pointerId
    swipeRef.current.startX = e.clientX
    swipeRef.current.startY = e.clientY
    swipeRef.current.moved = false
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  function onSwipePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (swipeRef.current.pointerId !== e.pointerId) return
    swipeRef.current.moved = true
  }

  function onSwipePointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (swipeRef.current.pointerId !== e.pointerId) return
    swipeRef.current.pointerId = null
    if (!swipeRef.current.moved) return
    if (showSaved || isAnswering) return
    if (!ordered.length) return

    const dx = e.clientX - swipeRef.current.startX
    const dy = e.clientY - swipeRef.current.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    const isHorizontal = absX >= 38 && absX > absY * 1.2
    if (!isHorizontal) return

    if (dx < 0 && safeIndex < ordered.length - 1) {
      props.onSetCardIndex(Math.min(ordered.length - 1, safeIndex + 1))
    } else if (dx > 0 && safeIndex > 0) {
      props.onSetCardIndex(Math.max(0, safeIndex - 1))
    }
  }

  async function handleAnswer(questionId: string, choice: AnswerChoice, questionText: string) {
    if (isAnswering) return
    try {
      props.onAnswerBegin()
      setIsAnswering(true)
      setSavedQuestionText(questionText)
      await props.onAnswer(questionId, choice)
      setShowSaved(true)
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
      savedTimerRef.current = window.setTimeout(() => {
        setShowSaved(false)
        setIsAnswering(false)
        setSavedQuestionText(null)
        props.onAnswerSaved()
      }, 650)
    } catch (e: unknown) {
      setIsAnswering(false)
      setShowSaved(false)
      setSavedQuestionText(null)
      props.onAnswerAbort()
      // App-level handler already surfaces errors; avoid unhandled rejections from click handlers.
      return
    }
  }

  return (
    <section className="card v3-card v3-pair">
      <div className="row v3-pair-actions">
        <button className="secondary" onClick={props.onBack} title="Zurück zur Partnerübersicht">
          ← Zurück
        </button>
        <RefreshButton onClick={props.onRefreshView} title="Ansicht neu laden" />
      </div>

      {pendingSettingsCount ? (
        <button type="button" className="v3-notice" onClick={() => goV3PairSettings(props.pairId)}>
          <SettingsIcon />
          <div className="v3-notice-text">
            <strong>Offene Einstellungsanfrage</strong>
            <span className="hint">Tippe hier, um sie in den Einstellungen zu prüfen.</span>
          </div>
        </button>
      ) : null}

      {pair.partnerDeleted ? <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div> : null}

      <div className="divider" />
      <div className="v3-pair-head">
        <div className="v3-pair-head-main">
          <ProfileAvatar name={pair.partner?.nickname ?? '??'} />
          <div>
            <h2 style={{ margin: 0 }}>{pair.partner ? `${pair.partner.nickname} (${pair.partner.code ?? '—'})` : pair.id}</h2>
            <div className="v3-pair-sub">
              {pair.partnerDeleted || pair.status !== 'active' ? (
                <span className={`pill status ${pair.status === 'active' ? 'ok' : pair.status === 'ended' ? 'ended' : 'pending'}`}>
                  {pair.partnerDeleted ? 'gelöscht' : pair.status === 'ended' ? 'beendet' : 'ausstehend'}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="v3-pair-tabs" role="tablist" aria-label="Bereiche">
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showPlay ? 'true' : 'false'}
          role="tab"
          aria-selected={showPlay}
          onClick={() => goV3Pair(props.pairId)}
        >
          Fragen
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showMatches ? 'true' : 'false'}
          role="tab"
          aria-selected={showMatches}
          onClick={() => goV3PairMatches(props.pairId)}
        >
          Matches
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showSettings ? 'true' : 'false'}
          role="tab"
          aria-selected={showSettings}
          onClick={() => goV3PairSettings(props.pairId)}
        >
          Einstellungen{pendingSettingsCount ? ` (${pendingSettingsCount})` : ''}
        </button>
      </div>

      {showPlay ? (
        <>
          <div className="divider" />
          <h2>Fragen spielen</h2>
          <p className="hint">
            Du und dein Partner habt jetzt Fragen zum Spielen. Beantworte offene Fragen, um neue Matches zu entdecken.
            {!isUnlimited ? ` Du kannst diese Woche noch ${Math.max(0, weeklyLimit - answeredThisWeek)} neue Antworten geben (Reset am ${nextWeeklyResetDateText()}).` : null}
          </p>

          <div className="v3-play-summary">
            <div className="pill mono">Offene Fragen: {ordered.length}</div>
            {!isUnlimited ? (
              remainingNewCount !== null && remainingNewCount <= ordered.length ? (
                <div className={`pill mono v3-remaining-pill ${remainingNewCount <= 3 ? 'v3-remaining-low' : ''}`}>
                  {remainingNewCount <= 3 ? `Nur noch ${remainingNewCount} übrig` : `Neue Antworten übrig: ${remainingNewCount}`}
                </div>
              ) : null
            ) : (
              <div className="pill mono">Alle Fragen erlaubt</div>
            )}
            <div className="v3-play-summary-spacer" />
            <button className="primary" onClick={props.onGoAsk} disabled={pair.status !== 'active' || !!pair.partnerDeleted}>
              Neue Frage stellen
            </button>
            {playedPending.length ? (
              <button className="secondary" onClick={props.onGoPlayed} disabled={pair.status !== 'active' || !!pair.partnerDeleted} title="Deine bereits abgegebenen Antworten anpassen (solange dein Partner noch nicht geantwortet hat).">
                Antworten anpassen ({playedPending.length})
              </button>
            ) : null}
          </div>

          {props.isLoadingPairData ? <div className="hint">⏳ Fragen werden geladen…</div> : null}

          {showLimitNotice ? (
            <div className="notice v3-limit-notice">
              <ClockIcon />
              <div>{limitNoticeText}</div>
            </div>
          ) : null}

          {!ordered.length ? (
            <>
              {allCurrentAnswered ? (
                <div className="v3-success">
                  <strong>Alles beantwortet</strong>
                  <div className="hint">
                    Für den Moment gibt es hier nichts zu tun. Du kannst eine neue Frage stellen und direkt selbst beantworten. Danach erscheint sie bei deinem Partner und kann auch von ihm beantwortet werden.
                  </div>
                </div>
              ) : (
                <div className="empty">Keine offenen Fragen für dich.</div>
              )}
            </>
          ) : (
            <>
              <div className="v3-play-panel">
              <div
                className="v3-play-card"
                data-saved={showSaved ? 'true' : 'false'}
                onPointerDown={onSwipePointerDown}
                onPointerMove={onSwipePointerMove}
                onPointerUp={onSwipePointerEnd}
                onPointerCancel={onSwipePointerEnd}
              >
                <div className="v3-play-card-top">
                  <div className="pill mono">
                    Frage {safeIndex + 1}/{ordered.length}
                  </div>
                  {(props.answerSummary[q.id]?.total ?? 0) === 1 ? (
                    <div className="pill v3-badge-partner-answered">Vom Partner beantwortet</div>
                  ) : null}
                </div>
                <div className="v3-play-question">{showSaved ? savedQuestionText ?? q.text : q.text}</div>
                {showSaved ? <div className="v3-answer-saved">Antwort wurde gespeichert.</div> : null}
                <div className="v3-choice-row">
                  <button className="choice yes" onClick={() => handleAnswer(q.id, 'yes', q.text)} disabled={!canAnswerNew || isAnswering}>
                    Ja
                  </button>
                  <button className="choice maybe" onClick={() => handleAnswer(q.id, 'maybe', q.text)} disabled={!canAnswerNew || isAnswering}>
                    Vielleicht
                  </button>
                  <button className="choice no" onClick={() => handleAnswer(q.id, 'no', q.text)} disabled={!canAnswerNew || isAnswering}>
                    Nein
                  </button>
                </div>
                <div className="v3-play-nav">
                  {safeIndex > 0 ? (
                    <button className="secondary v3-play-prev" onClick={() => props.onSetCardIndex(Math.max(0, safeIndex - 1))} title="Vorige Frage" aria-label="Vorige Frage">
                      <NavBackIcon />
                    </button>
                  ) : null}
                  {safeIndex < ordered.length - 1 ? (
                    <button className="secondary v3-play-next" onClick={() => props.onSetCardIndex(Math.min(ordered.length - 1, safeIndex + 1))} title="Nächste Frage" aria-label="Nächste Frage">
                      <NavNextIcon />
                    </button>
                  ) : null}
                </div>
              </div>

              </div>
            </>
          )}

        </>
      ) : null}

      {showMatches ? (
        <>
          <div className="divider" />
          <div className="row">
            <h2 style={{ margin: 0 }}>{props.showHiddenMatches ? `Ausgeblendete Matches (${props.visibleMatchesCount})` : `Matches (${props.visibleMatchesCount})`}</h2>
            <RefreshButton onClick={props.onComputeMatches} title="Matches neu berechnen" />
          </div>
          {props.isLoadingMatches ? (
            <div className="hint">⏳ Matches werden geladen…</div>
          ) : props.matches.length ? (
            <div className="match-grid">
              {props.matches
                .filter((m) => (props.showHiddenMatches ? props.hiddenMatchIds.includes(m.id) : !props.hiddenMatchIds.includes(m.id)))
                .map((m) => (
                  <div className={`match-card ${m.grade}`} key={m.id}>
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
                    <div className="match-card-actions">
                      <button
                        className="secondary icon-btn mini"
                        title={props.showHiddenMatches ? 'Match wieder anzeigen' : 'Match ausblenden'}
                        onClick={() =>
                          props.setHiddenMatchIds((prev) =>
                            props.showHiddenMatches ? prev.filter((id) => id !== m.id) : prev.includes(m.id) ? prev : [...prev, m.id],
                          )
                        }
                      >
                        <MatchVisibilityIcon hidden={!props.showHiddenMatches} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="empty">Noch keine Matches.</div>
          )}

          {props.hiddenMatchIds.length ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="secondary small-btn"
                onClick={() => props.setShowHiddenMatches((prev) => !prev)}
                disabled={!props.showHiddenMatches && showHiddenMatchesDisabled}
                title={props.showHiddenMatches ? 'Zur normalen Match-Ansicht wechseln' : 'Ausgeblendete Matches anzeigen'}
              >
                {props.showHiddenMatches ? '✣ Matches anzeigen' : '✣ Ausgeblendete Matches anzeigen'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {showSettings ? (
        <>
          <div className="divider" />
          <div className="row">
            <h2 style={{ margin: 0 }}>Gruppen-Einstellungen</h2>
            <RefreshButton onClick={props.onRefreshGroupSettings} title="Gruppen-Einstellungen neu laden" />
          </div>
          {props.isLoadingGroupSettings ? (
            <div className="hint">⏳ Gruppen-Einstellungen werden geladen…</div>
          ) : (
            <div className="settings-panel">
              <div className="settings-item">
                <div className="settings-item-title">Fragenlimit pro Woche</div>
                <p className="settings-text">
                  Wenn aktiviert können pro Spieler nur x Fragen pro Woche beantwortet werden, erst in der darauf folgenden Woche gibt es weitere Fragen. So ist die Spannung jede Woche groß, ob es ein weiteres Match gibt.
                </p>
                <div className="row">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={!props.allowAllQuestions}
                      onChange={(e) => props.setAllowAllQuestions(!e.target.checked)}
                      disabled={!!pair.weeklyLimitPending || props.isLoadingGroupSettings}
                    />
                    <span>Limit aktivieren</span>
                  </label>
                  {props.allowAllQuestions ? (
                    <div className="pill mono">Alle Fragen erlaubt</div>
                  ) : (
                    <label className="field inline">
                      <span>Fragen / Woche</span>
                      <input value={props.weeklyLimitInput} onChange={(e) => props.setWeeklyLimitInput(e.target.value)} disabled={!!pair.weeklyLimitPending || props.isLoadingGroupSettings} />
                    </label>
                  )}
                  <button className="secondary" onClick={props.onProposeGroupSettings} disabled={!canProposeSettings}>
                    Vorschlagen
                  </button>
                </div>
                <div className="settings-current">Aktuell: {pair.weeklyLimit === 0 ? 'Alle Fragen erlaubt' : `${pair.weeklyLimit} Fragen pro Woche`}</div>
              </div>

              {pair.weeklyLimitPending ? (
                <div className="settings-pending-block">
                  <div className="settings-item-title">Offene Einstellungsanfrage</div>
                  {pair.weeklyLimitPending.proposedBy === props.identityUserId ? (
                    <div className="request request-panel">
                      <div className="row request-panel-head settings-request-head">
                        <div>
                          <div className="pair-card-name">Fragenlimit pro Woche</div>
                          <div className="pair-card-code mono">{pair.weeklyLimitPending.limit === 0 ? 'Alle Fragen erlauben' : `${pair.weeklyLimitPending.limit} Fragen/Woche`}</div>
                        </div>
                        <button className="secondary action-cancel" onClick={() => props.onRespondGroupSettings('cancel')} disabled={props.isLoadingGroupSettings} title="Eigenen Vorschlag zurückziehen">
                          Zurückziehen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="request request-panel">
                      <div className="row request-panel-head settings-request-head">
                        <div>
                          <div className="pair-card-name">Fragenlimit pro Woche</div>
                          <div className="pair-card-code mono">{pair.weeklyLimitPending.limit === 0 ? 'Alle Fragen erlauben' : `${pair.weeklyLimitPending.limit} Fragen/Woche`}</div>
                        </div>
                      </div>
                      <div className="row request-actions">
                        <button className="action-accept" onClick={() => props.onRespondGroupSettings('accept')} disabled={props.isLoadingGroupSettings}>
                          ✓ Annehmen
                        </button>
                        <button className="action-reject" onClick={() => props.onRespondGroupSettings('reject')} disabled={props.isLoadingGroupSettings}>
                          ✕ Ablehnen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
