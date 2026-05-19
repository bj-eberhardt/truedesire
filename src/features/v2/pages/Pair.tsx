import { useMemo, useRef } from 'react'
import { MatchVisibilityIcon } from '../../../components/MatchVisibilityIcon'
import { ProfileAvatar } from '../../../components/ProfileAvatar'
import { RefreshButton } from '../../../components/RefreshButton'
import type { MatchView } from '../../../hooks/useMatches'
import type { AnswerChoice, DecryptedQuestion, PairView } from '../../../types'

function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  return d.toLocaleDateString()
}

type PairPageProps = {
  pairId: string
  identityUserId: string
  pair: PairView | null
  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  isLoadingPairData: boolean
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>

  v2CardIndex: number
  onSetV2CardIndex: (idx: number) => void

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
  v2AllowAllQuestions: boolean
  setV2AllowAllQuestions: (v: boolean) => void
  isLoadingGroupSettings: boolean
  onRefreshGroupSettings: () => Promise<void>
  onProposeGroupSettings: () => Promise<void>
  onRespondGroupSettings: (action: 'accept' | 'reject' | 'cancel') => Promise<void>
}

export function PairPage(props: PairPageProps) {
  const playSectionRef = useRef<HTMLHeadingElement | null>(null)
  const matchesSectionRef = useRef<HTMLDivElement | null>(null)
  const groupSettingsSectionRef = useRef<HTMLHeadingElement | null>(null)

  function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 92
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  const hiddenCount = useMemo(() => props.matches.filter((m) => props.hiddenMatchIds.includes(m.id)).length, [props.hiddenMatchIds, props.matches])

  const showHiddenMatchesDisabled = hiddenCount === 0

  const canProposeSettings = useMemo(() => {
    if (!props.pair) return false
    if (props.pair.weeklyLimitPending) return false
    if (props.isLoadingGroupSettings) return false
    const nextLimit = props.v2AllowAllQuestions ? 0 : Number(props.weeklyLimitInput)
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || nextLimit > 50) return false
    const currentLimit = props.pair.usage?.weeklyLimit ?? props.pair.weeklyLimit
    if (nextLimit === currentLimit) return false
    return true
  }, [props.isLoadingGroupSettings, props.pair, props.v2AllowAllQuestions, props.weeklyLimitInput])

  if (!props.pair || props.pair.id !== props.pairId) {
    return (
      <section className="card v2-detail">
        <div className="row">
          <button className="secondary" onClick={props.onBack} title="Zurück zur Partnerübersicht">
            ← Zurück
          </button>
          <RefreshButton onClick={props.onRefreshView} disabled={!props.pair || props.pair.id !== props.pairId} title="Ansicht neu laden" />
          <button className="primary" title="Eine eigene Frage stellen, die der Partner dann mitbeantworten kann" onClick={props.onGoAsk} disabled>
            Eine Frage stellen
          </button>
        </div>
        <div className="row">
          <div className="empty" style={{ width: '100%' }}>
            Verknüpfung wird geladen…
          </div>
        </div>
      </section>
    )
  }

  const pair = props.pair

  const weeklyLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
  const isUnlimited = weeklyLimit === 0
  const answeredThisWeek = pair.usage?.answeredThisWeek ?? 0
  const remainingNew = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, weeklyLimit - answeredThisWeek)

  const baseOpen = props.questions.slice().filter((q) => (props.answerSummary[q.id]?.total ?? 0) < 2)
  const unansweredAll = baseOpen.filter((q) => !props.answerSummary[q.id]?.mine)
  const openNonOwn = unansweredAll.filter((q) => q.createdBy !== props.identityUserId).length
  const playedPending = baseOpen.filter((q) => !!props.answerSummary[q.id]?.mine)

  const unanswered = remainingNew > 0 ? unansweredAll : unansweredAll.filter((q) => q.createdBy === props.identityUserId)
  const ordered = unanswered.sort((a, b) => b.createdAt - a.createdAt)

  const safeIndex = Math.min(props.v2CardIndex, Math.max(0, ordered.length - 1))
  const q = ordered[safeIndex]
  const canAnswerNew = q ? q.createdBy === props.identityUserId || remainingNew > 0 : false

  return (
    <section className="card v2-detail">
      <div className="row">
        <button className="secondary" onClick={props.onBack} title="Zurück zur Partnerübersicht">
          ← Zurück
        </button>
        <RefreshButton onClick={props.onRefreshView} title="Ansicht neu laden" />
        <button className="primary" title="Eine eigene Frage stellen, die der Partner dann mitbeantworten kann" onClick={props.onGoAsk} disabled={pair.status !== 'active' || !!pair.partnerDeleted}>
          Eine Frage stellen
        </button>
      </div>

      {pair.partnerDeleted ? <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div> : null}

      <div className="divider" />
      <div className="row pair-headline">
        <div className="pair-headline-main">
          <ProfileAvatar name={pair.partner?.nickname ?? '??'} />
          <h2 style={{ margin: 0 }}>{pair.partner ? `${pair.partner.nickname} (${pair.partner.code ?? '—'})` : pair.id}</h2>
        </div>
        <div className={`pill status ${pair.status === 'active' ? 'ok' : pair.status === 'ended' ? 'ended' : 'pending'}`}>{pair.status}</div>
      </div>

      <div className="row pair-quick-links">
        <button className="link-btn" onClick={() => scrollToSection(playSectionRef)} title="Zu Fragen spielen springen">
          ✣ Fragen spielen
        </button>
        <button className="link-btn" onClick={() => scrollToSection(matchesSectionRef)} title="Zu Matches springen">
          ✣ Matches
        </button>
        <button className="link-btn" onClick={() => scrollToSection(groupSettingsSectionRef)} title="Zu Gruppeneinstellungen springen">
          ✣ Gruppeneinstellungen
        </button>
      </div>

      {pair.partnerDeleted ? null : (
        <>
          <div className="divider" />
          <div className="row">
            {isUnlimited ? <div className="pill mono">Wochenlimit: Alle Fragen erlaubt</div> : null}
            {!isUnlimited ? (
              (() => {
                const remainingToAnswer = Math.min(remainingNew, openNonOwn)
                const showRemainingHint = remainingToAnswer > 0 || (remainingNew === 0 && openNonOwn > 0)
                return (
                  <>
                    {showRemainingHint ? <div className="pill mono">Noch {remainingToAnswer} zu beantwortende Fragen für diese Woche</div> : null}
                    {!isUnlimited && remainingNew === 0 && openNonOwn > 0 ? <div className="pill mono">Limit erreicht</div> : null}
                  </>
                )
              })()
            ) : null}
          </div>

          <div className="divider" />
          <h2 ref={playSectionRef}>Fragen spielen</h2>
          {props.isLoadingPairData ? (
            <div className="hint">⏳ Fragen werden geladen…</div>
          ) : !ordered.length ? (
            <>
              {!isUnlimited && remainingNew === 0 && openNonOwn > 0 ? (
                <div className="notice">
                  Wochenlimit erreicht. Reset am {nextWeeklyResetDateText()}. Danach geht es mit {openNonOwn} offenen Partner-Fragen weiter.
                </div>
              ) : (
                (() => {
                  const allCurrentAnswered = props.questions.length > 0 && unansweredAll.length === 0 && openNonOwn === 0
                  return (
                    <>
                      {allCurrentAnswered ? (
                        <div className="success-badge success-done" role="status" aria-live="polite">
                          <strong>Alles beantwortet</strong>
                          <span>
                            Für den Moment gibt es hier nichts zu tun. Du kannst aber{' '}
                            <button className="inline-link-btn" onClick={props.onGoAsk}>
                              eine neue Frage
                            </button>{' '}
                            stellen, die ihr beantworten dürft.
                          </span>
                        </div>
                      ) : null}
                      {!allCurrentAnswered ? <div className="empty">Keine offenen Fragen für dich.</div> : null}
                    </>
                  )
                })()
              )}
              {playedPending.length ? (
                <div className="row">
                  <button className="secondary" onClick={props.onGoPlayed}>
                    ✣ Deine Antworten, Partner noch offen ({playedPending.length})
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {!isUnlimited && remainingNew === 0 && openNonOwn > 0 ? (
                <div className="notice">
                  Wochenlimit erreicht. Du kannst diese Woche keine neuen Antworten mehr abgeben. Bereits beantwortete Fragen mit offenem Partner-Status kannst du noch anpassen. Reset am{' '}
                  {nextWeeklyResetDateText()}. Danach geht es mit {openNonOwn} offenen Partner-Fragen weiter.
                </div>
              ) : null}

              <div className="play-card">
                <div className="row play-top">
                  <div className="pill mono">
                    Frage {safeIndex + 1}/{ordered.length}
                  </div>
                  <div className="hint mono">Antworten: {props.answerSummary[q.id]?.total ?? 0}/2</div>
                </div>
                <div className="play-question">{q.text}</div>
                <div className="row play-actions">
                  <button className="choice yes" onClick={() => props.onAnswer(q.id, 'yes')} disabled={!canAnswerNew}>
                    Ja
                  </button>
                  <button className="choice maybe" onClick={() => props.onAnswer(q.id, 'maybe')} disabled={!canAnswerNew}>
                    Vielleicht
                  </button>
                  <button className="choice no" onClick={() => props.onAnswer(q.id, 'no')} disabled={!canAnswerNew}>
                    Nein
                  </button>
                </div>
                <div className="row play-nav">
                  <button className="secondary" onClick={() => props.onSetV2CardIndex(Math.max(0, safeIndex - 1))} disabled={safeIndex <= 0}>
                    Vorige
                  </button>
                  <button className="secondary" onClick={() => props.onSetV2CardIndex(Math.min(ordered.length - 1, safeIndex + 1))} disabled={safeIndex >= ordered.length - 1}>
                    Nächste
                  </button>
                </div>
              </div>
              {playedPending.length ? (
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="secondary" onClick={props.onGoPlayed}>
                    ✣ Deine Antworten, Partner noch offen ({playedPending.length})
                  </button>
                </div>
              ) : null}
            </>
          )}

          <div className="divider" />
          <div className="row" ref={matchesSectionRef}>
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

          {!props.isLoadingMatches && props.matches.length > 0 && props.visibleMatchesCount === 0 ? (
            <div className="empty">{props.showHiddenMatches ? 'Keine ausgeblendeten Matches.' : 'Alle Matches sind ausgeblendet.'}</div>
          ) : null}

          {props.hiddenMatchIds.length ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="secondary small-btn"
                onClick={() => props.setShowHiddenMatches((prev) => !prev)}
                title={props.showHiddenMatches ? 'Zur normalen Match-Ansicht wechseln' : 'Ausgeblendete Matches anzeigen'}
                disabled={showHiddenMatchesDisabled}
              >
                {props.showHiddenMatches ? '✣ Matches anzeigen' : '✣ Ausgeblendete Matches anzeigen'}
              </button>
            </div>
          ) : null}

          <div className="divider" />
          <div className="row" ref={groupSettingsSectionRef}>
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
                      checked={!props.v2AllowAllQuestions}
                      onChange={(e) => props.setV2AllowAllQuestions(!e.target.checked)}
                      disabled={!!pair.weeklyLimitPending || props.isLoadingGroupSettings}
                    />
                    <span>Limit aktivieren</span>
                  </label>
                  {props.v2AllowAllQuestions ? (
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
                        <button
                          className="secondary action-cancel"
                          onClick={() => props.onRespondGroupSettings('cancel')}
                          disabled={props.isLoadingGroupSettings}
                          title="Eigenen Vorschlag zurückziehen"
                        >
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
      )}
    </section>
  )
}
