import { useEffect, useMemo, useState } from "react";
import { MatchVisibilityIcon } from "../../../components/MatchVisibilityIcon";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import type { MatchView } from "../../../hooks/useMatches";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../types";
import { goV3Pair, goV3PairMatches, goV3PairSettings } from "../../../app/routes";
import { V3Notice } from "../components/V3Notice";
import { ChevronLeftIcon } from "../components/icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../components/icons/ChevronRightIcon";
import { CalendarIcon } from "../components/icons/CalendarIcon";
import { ClockIcon } from "../components/icons/ClockIcon";
import { SettingsIcon } from "../components/icons/SettingsIcon";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../hooks/useSavedFlash";
import { useSwipeNav } from "../hooks/useSwipeNav";
import { getOpenQuestions, sortByCreatedAtDesc } from "../lib/questions";

function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toLocaleDateString();
}

type PairPageProps = {
  pairId: string;
  activeTab: "play" | "matches" | "settings";
  identityUserId: string;
  pair: PairView | null;
  questions: DecryptedQuestion[];
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  isLoadingPairData: boolean;
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>;
  onAnswerBegin: () => void;
  onAnswerAbort: () => void;
  onAnswerSaved: () => void;

  cardIndex: number;
  onSetCardIndex: (idx: number) => void;

  onBack: () => void;
  onRefreshView: () => Promise<void>;
  onGoAsk: () => void;
  onGoPlayed: () => void;

  matches: MatchView[];
  isLoadingMatches: boolean;
  onComputeMatches: () => Promise<void>;
  hiddenMatchIds: string[];
  setHiddenMatchIds: (fn: (prev: string[]) => string[]) => void;
  showHiddenMatches: boolean;
  setShowHiddenMatches: (fn: (prev: boolean) => boolean) => void;

  visibleMatchesCount: number;

  weeklyLimitInput: string;
  setWeeklyLimitInput: (v: string) => void;
  allowAllQuestions: boolean;
  setAllowAllQuestions: (v: boolean) => void;
  isLoadingGroupSettings: boolean;
  onRefreshGroupSettings: () => Promise<void>;
  onProposeGroupSettings: () => Promise<void>;
  onRespondGroupSettings: (action: "accept" | "reject" | "cancel") => Promise<void>;
};

export function PairPage(props: PairPageProps) {
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });
  const [stablePlayState, setStablePlayState] = useState<{
    pair: PairView;
    questions: DecryptedQuestion[];
    answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  } | null>(null);

  const hiddenCount = useMemo(
    () => props.matches.filter((m) => props.hiddenMatchIds.includes(m.id)).length,
    [props.hiddenMatchIds, props.matches]
  );

  const showHiddenMatchesDisabled = hiddenCount === 0;

  const canProposeSettings = useMemo(() => {
    if (!props.pair) return false;
    if (props.pair.weeklyLimitPending) return false;
    if (props.isLoadingGroupSettings) return false;
    const nextLimit = props.allowAllQuestions ? 0 : Number(props.weeklyLimitInput);
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || nextLimit > 50) return false;
    const currentLimit = props.pair.usage?.weeklyLimit ?? props.pair.weeklyLimit;
    if (nextLimit === currentLimit) return false;
    return true;
  }, [props.allowAllQuestions, props.isLoadingGroupSettings, props.pair, props.weeklyLimitInput]);

  const routePairReady = !!props.pair && props.pair.id === props.pairId;

  useEffect(() => {
    if (!props.isLoadingPairData && routePairReady && props.pair) {
      setStablePlayState({
        pair: props.pair,
        questions: props.questions,
        answerSummary: props.answerSummary
      });
    }
  }, [props.answerSummary, props.isLoadingPairData, props.pair, props.questions, routePairReady]);

  const stablePlay = props.isLoadingPairData ? stablePlayState : null;
  const pair = stablePlay?.pair ?? props.pair;
  const questions = stablePlay?.questions ?? props.questions;
  const answerSummary = stablePlay?.answerSummary ?? props.answerSummary;
  const pairReady = !!pair && pair.id === props.pairId;

  const weeklyLimit = pairReady ? (pair.usage?.weeklyLimit ?? pair.weeklyLimit) : 0;
  const isUnlimited = weeklyLimit === 0;
  const answeredThisWeek = pairReady ? (pair.usage?.answeredThisWeek ?? 0) : 0;
  const remainingNew = isUnlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, weeklyLimit - answeredThisWeek);
  const pendingSettingsCount =
    pairReady &&
    pair.weeklyLimitPending &&
    pair.weeklyLimitPending.proposedBy !== props.identityUserId
      ? 1
      : 0;

  const baseOpen = pairReady ? getOpenQuestions(questions, answerSummary) : [];
  const unansweredAll = baseOpen.filter((q) => !answerSummary[q.id]?.mine);
  const openNonOwn = unansweredAll.filter((q) => q.createdBy !== props.identityUserId).length;
  const playedPending = baseOpen.filter((q) => !!answerSummary[q.id]?.mine);

  const unanswered =
    remainingNew > 0
      ? unansweredAll
      : unansweredAll.filter((q) => q.createdBy === props.identityUserId);
  const ordered = sortByCreatedAtDesc(unanswered);

  const safeIndex = Math.min(props.cardIndex, Math.max(0, ordered.length - 1));
  const q = ordered[safeIndex];
  const showSavedOnlyCard = flash.showSaved && !q && !!flash.savedId;
  const visibleQuestionId = q?.id ?? flash.savedId ?? "";
  const visibleQuestionText = q
    ? flash.showSaved
      ? (flash.savedText ?? q.text)
      : q.text
    : (flash.savedText ?? "");
  const canAnswerNew = q ? q.createdBy === props.identityUserId || remainingNew > 0 : false;
  const canPrev = !!q && safeIndex > 0;
  const canNext = !!q && safeIndex < ordered.length - 1;

  const showLimitNotice = !flash.showSaved && !isUnlimited && remainingNew === 0 && openNonOwn > 0;
  const allCurrentAnswered = questions.length > 0 && unansweredAll.length === 0 && openNonOwn === 0;
  const limitNoticeText =
    openNonOwn > 0
      ? `Wochenlimit erreicht. Nach dem Wochenreset am ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten. Es warten dann noch ${openNonOwn} offene Fragen auf dich.`
      : `Wochenlimit erreicht. Nach dem Wochenreset am ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten.`;

  const showPlay = props.activeTab === "play";
  const showMatches = props.activeTab === "matches";
  const showSettings = props.activeTab === "settings";

  const swipe = useSwipeNav({
    enabled: pairReady && showPlay,
    blocked: flash.isSaving || flash.showSaved,
    canPrev,
    canNext,
    onPrev: () => props.onSetCardIndex(Math.max(0, safeIndex - 1)),
    onNext: () => props.onSetCardIndex(Math.min(ordered.length - 1, safeIndex + 1))
  });

  if (!pairReady) {
    return (
      <section className="card v3-card" data-testid="pair-loading-view">
        <div className="row">
          <button
            className="secondary"
            data-testid="pair-loading-back-button"
            onClick={props.onBack}
            title="Zurück zur Partnerübersicht"
          >
            ← Zurück
          </button>
          <RefreshButton
            testId="pair-loading-refresh-button"
            onClick={props.onRefreshView}
            disabled
            title="Ansicht neu laden"
          />
          <button className="primary" disabled>
            Eine Frage stellen
          </button>
        </div>
        <div className="empty" style={{ width: "100%" }}>
          Verknüpfung wird geladen…
        </div>
      </section>
    );
  }

  async function handleAnswer(questionId: string, choice: AnswerChoice, questionText: string) {
    if (flash.isSaving) return;
    try {
      props.onAnswerBegin();
      flash.begin(questionId, questionText);
      await props.onAnswer(questionId, choice);
      flash.success(() => props.onAnswerSaved());
    } catch (_e: unknown) {
      flash.fail();
      props.onAnswerAbort();
      // App-level handler already surfaces errors; avoid unhandled rejections from click handlers.
      return;
    }
  }

  return (
    <section className="card v3-card v3-pair" data-testid="pair-view" data-pair-id={props.pairId}>
      <div className="v3-pair-topbar">
        <button
          className="secondary v3-pair-back"
          data-testid="pair-back-button"
          onClick={props.onBack}
          title="Zurück zur Partnerübersicht"
        >
          ← Zurück
        </button>
        <div className="v3-pair-head">
          <div className="v3-pair-head-main">
            <ProfileAvatar name={pair.partner?.nickname ?? "??"} />
            <div className="v3-pair-meta">
              <h2>{pair.partner?.nickname ?? pair.id}</h2>
              <div className="v3-pair-sub">
                <span className="pill mono v3-pair-code">{pair.partner?.code ?? "—"}</span>
                {pair.partnerDeleted || pair.status !== "active" ? (
                  <span
                    className={`pill status ${pair.status === "active" ? "ok" : pair.status === "ended" ? "ended" : "pending"}`}
                  >
                    {pair.partnerDeleted
                      ? "gelöscht"
                      : pair.status === "ended"
                        ? "beendet"
                        : "ausstehend"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="v3-pair-actions">
          <RefreshButton
            testId="pair-refresh-button"
            onClick={props.onRefreshView}
            title="Ansicht neu laden"
          />
        </div>
      </div>

      {pendingSettingsCount ? (
        <V3Notice
          icon={<SettingsIcon />}
          title="Offene Einstellungsanfrage"
          hint="Tippe hier, um sie in den Einstellungen zu prüfen."
          onClick={() => goV3PairSettings(props.pairId)}
        />
      ) : null}

      {pair.partnerDeleted ? (
        <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div>
      ) : null}

      <div className="v3-pair-tabs" role="tablist" aria-label="Bereiche">
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showPlay ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-play"
          aria-selected={showPlay}
          onClick={() => {
            goV3Pair(props.pairId);
            void props.onRefreshView();
          }}
        >
          Fragen
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showMatches ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-matches"
          aria-selected={showMatches}
          onClick={() => {
            goV3PairMatches(props.pairId);
            void props.onComputeMatches();
          }}
        >
          Matches
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showSettings ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-settings"
          aria-selected={showSettings}
          onClick={() => {
            goV3PairSettings(props.pairId);
            void props.onRefreshGroupSettings();
          }}
        >
          Einstellungen{pendingSettingsCount ? ` (${pendingSettingsCount})` : ""}
        </button>
      </div>

      {showPlay ? (
        <>
          <div className="v3-play-intro">
            <h2>Fragen spielen</h2>
            {!showLimitNotice ? (
              <p className="hint">
                Du und dein Partner habt jetzt Fragen zum Spielen. Beantworte offene Fragen, um neue
                Matches zu entdecken.
                {!isUnlimited ? (
                  <span className="v3-weekly-hint">
                    Du kannst diese Woche noch
                    <span
                      className={`pill mono v3-inline-count-pill ${remainingNew < 3 ? "v3-inline-count-low" : ""}`}
                    >
                      {remainingNew}
                    </span>
                    neue Antworten geben.

                    Wochenreset am {nextWeeklyResetDateText()}. <CalendarIcon className="v3-weekly-calendar-icon" />
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {props.isLoadingPairData ? (
            <div className="hint" data-testid="pair-loading-indicator">
              ⏳ Fragen werden geladen…
            </div>
          ) : null}

          {showLimitNotice ? (
            <div className="notice v3-limit-notice" data-testid="weekly-limit-notice">
              <ClockIcon />
              <div>{limitNoticeText}</div>
            </div>
          ) : null}

          {!ordered.length && !showSavedOnlyCard ? (
            <>
              {allCurrentAnswered ? (
                <div className="v3-success" data-testid="all-answered-state">
                  <strong>Alles beantwortet</strong>
                  <div className="hint">
                    Für den Moment gibt es hier nichts zu tun. Du kannst eine neue Frage stellen und
                    direkt selbst beantworten. Danach erscheint sie bei deinem Partner und kann auch
                    von ihm beantwortet werden.
                  </div>
                </div>
              ) : (
                <div className="empty" data-testid="no-open-questions">
                  Keine offenen Fragen für dich.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="v3-play-panel">
                <div
                  className="v3-play-card"
                  data-testid="play-card"
                  data-question-id={visibleQuestionId}
                  data-saved={flash.showSaved ? "true" : "false"}
                  onPointerDown={swipe.onPointerDown}
                  onPointerMove={swipe.onPointerMove}
                  onPointerUp={swipe.onPointerUp}
                  onPointerCancel={swipe.onPointerCancel}
                >
                  <div className="v3-play-card-top">
                    <div className="pill mono">
                      {q ? `Frage ${safeIndex + 1}/${ordered.length}` : "Gespeichert"}
                    </div>
                    {q && (answerSummary[q.id]?.total ?? 0) === 1 ? (
                      <div className="pill v3-badge-partner-answered">Vom Partner beantwortet</div>
                    ) : null}
                  </div>
                  <div className="v3-play-question" data-testid="play-question-text">
                    {visibleQuestionText}
                  </div>
                  <div className="v3-choice-row">
                    <button
                      className="choice yes"
                      data-testid="answer-yes-button"
                      onClick={() => q && handleAnswer(q.id, "yes", q.text)}
                      disabled={!q || !canAnswerNew || flash.isSaving}
                    >
                      Ja
                    </button>
                    <button
                      className="choice maybe"
                      data-testid="answer-maybe-button"
                      onClick={() => q && handleAnswer(q.id, "maybe", q.text)}
                      disabled={!q || !canAnswerNew || flash.isSaving}
                    >
                      Vielleicht
                    </button>
                    <button
                      className="choice no"
                      data-testid="answer-no-button"
                      onClick={() => q && handleAnswer(q.id, "no", q.text)}
                      disabled={!q || !canAnswerNew || flash.isSaving}
                    >
                      Nein
                    </button>
                  </div>
                  <div className="v3-play-nav">
                    <div className="v3-play-nav-slot v3-play-nav-slot-prev">
                      {canPrev ? (
                        <button
                          className="secondary v3-play-prev"
                          data-testid="play-prev-button"
                          onClick={() => props.onSetCardIndex(Math.max(0, safeIndex - 1))}
                          title="Vorige Frage"
                          aria-label="Vorige Frage"
                        >
                          <ChevronLeftIcon />
                        </button>
                      ) : null}
                    </div>
                    <div className="v3-play-nav-message">
                      {flash.showSaved ? (
                        <div
                          className="v3-answer-saved v3-answer-saved-nav"
                          data-testid="answer-saved-indicator"
                        >
                          Frage wurde beantwortet.
                        </div>
                      ) : null}
                    </div>
                    <div className="v3-play-nav-slot v3-play-nav-slot-next">
                      {canNext ? (
                        <button
                          className="secondary v3-play-next"
                          data-testid="play-next-button"
                          onClick={() =>
                            props.onSetCardIndex(Math.min(ordered.length - 1, safeIndex + 1))
                          }
                          title="Nächste Frage"
                          aria-label="Nächste Frage"
                        >
                          <ChevronRightIcon />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="v3-play-toolbar" data-testid="play-summary">
            <div className="v3-play-actions">
              <div className="v3-play-action-card">
                <button
                  className="primary"
                  data-testid="ask-question-button"
                  onClick={props.onGoAsk}
                  disabled={pair.status !== "active" || !!pair.partnerDeleted}
                >
                  Neue Frage stellen
                </button>
                <div className="v3-action-hint">
                  Du möchtest eigene Fragen stellen und beantwortet haben?
                </div>
              </div>
              {playedPending.length ? (
                <div className="v3-play-action-card">
                  <button
                    className="secondary"
                    data-testid="played-answers-button"
                    onClick={props.onGoPlayed}
                    disabled={pair.status !== "active" || !!pair.partnerDeleted}
                    title="Deine bereits abgegebenen Antworten anpassen (solange dein Partner noch nicht geantwortet hat)."
                  >
                    Antworten anpassen ({playedPending.length})
                  </button>
                  <div className="v3-action-hint">
                    Solange dein Partner die Frage nicht beantwortet hat, kannst du deine Meinung
                    gerne ändern.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {showMatches ? (
        <>
          <div className="divider" />
          <div className="v3-matches-head">
            <div>
              <h2>
                {props.showHiddenMatches
                  ? `Ausgeblendete Matches (${props.visibleMatchesCount})`
                  : `Matches (${props.visibleMatchesCount})`}
              </h2>
              <p className="hint v3-matches-subtitle">
                {props.showHiddenMatches
                  ? "Hier findest du Matches, die du ausgeblendet hast."
                  : "Hier findest du Matches, bei denen Ihr beide grundsätzlich dafür seid. Nutzt die Gelegenheit und sprecht drüber."}
              </p>
            </div>
            <RefreshButton
              testId="matches-refresh-button"
              onClick={props.onComputeMatches}
              title="Matches neu berechnen"
            />
          </div>
          {props.isLoadingMatches ? (
            <div className="hint">⏳ Matches werden geladen…</div>
          ) : props.matches.length ? (
            <div className="match-grid" data-testid="matches-grid">
              {props.matches
                .filter((m) =>
                  props.showHiddenMatches
                    ? props.hiddenMatchIds.includes(m.id)
                    : !props.hiddenMatchIds.includes(m.id)
                )
                .map((m) => (
                  <div
                    className={`match-card ${m.grade}`}
                    data-testid="match-card"
                    data-match-id={m.id}
                    data-match-grade={m.grade}
                    key={m.id}
                  >
                    <div className="match-head">
                      <div className={`badge ${m.grade}`}>
                        <svg className="match-grade-icon" viewBox="0 0 24 24" aria-hidden="true">
                          {m.grade === "perfect" ? (
                            <path
                              d="M12 21s-7-4.4-9.2-9A5.7 5.7 0 0 1 12 5.7 5.7 5.7 0 0 1 21.2 12C19 16.6 12 21 12 21Z"
                              fill="currentColor"
                            />
                          ) : m.grade === "maybe" ? (
                            <path
                              d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9l6-.9L12 3.5Z"
                              fill="currentColor"
                            />
                          ) : (
                            <circle cx="12" cy="12" r="7" fill="currentColor" />
                          )}
                        </svg>
                        <span className="match-grade-copy">
                          <span className="match-grade-kicker">
                            {m.grade === "perfect"
                              ? "Starkes Match"
                              : m.grade === "maybe"
                                ? "Interessante Nähe"
                                : "Guter Start"}
                          </span>
                          <span className="match-grade-label">
                            {m.grade === "perfect"
                              ? "Perfekt"
                              : m.grade === "maybe"
                                ? "Vielleicht"
                                : "Okay"}
                          </span>
                        </span>
                      </div>
                      <div className="match-title" data-testid="match-question-text">
                        {m.question}
                      </div>
                    </div>
                    <div className="match-card-actions">
                      <button
                        className="secondary icon-btn mini"
                        data-testid="match-visibility-button"
                        title={
                          props.showHiddenMatches ? "Match wieder anzeigen" : "Match ausblenden"
                        }
                        onClick={() =>
                          props.setHiddenMatchIds((prev) =>
                            props.showHiddenMatches
                              ? prev.filter((id) => id !== m.id)
                              : prev.includes(m.id)
                                ? prev
                                : [...prev, m.id]
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
            <div className="empty" data-testid="no-matches-state">
              Noch keine Matches.
            </div>
          )}

          {props.hiddenMatchIds.length ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="secondary small-btn"
                data-testid="toggle-hidden-matches-button"
                onClick={() => props.setShowHiddenMatches((prev) => !prev)}
                disabled={!props.showHiddenMatches && showHiddenMatchesDisabled}
                title={
                  props.showHiddenMatches
                    ? "Zur normalen Match-Ansicht wechseln"
                    : "Ausgeblendete Matches anzeigen"
                }
              >
                {props.showHiddenMatches
                  ? "✣ Matches anzeigen"
                  : "✣ Ausgeblendete Matches anzeigen"}
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
            <RefreshButton
              testId="settings-refresh-button"
              onClick={props.onRefreshGroupSettings}
              title="Gruppen-Einstellungen neu laden"
            />
          </div>
          {props.isLoadingGroupSettings ? (
            <div className="hint">⏳ Gruppen-Einstellungen werden geladen…</div>
          ) : (
            <div className="settings-panel" data-testid="settings-panel">
              <div className="settings-item">
                <div className="settings-item-title">Fragenlimit pro Woche</div>
                <p className="settings-text">
                  Wenn aktiviert können pro Spieler nur {props.weeklyLimitInput || "0"} Fragen pro
                  Woche beantwortet werden, erst in der darauf folgenden Woche gibt es weitere
                  Fragen. So ist die Spannung jede Woche groß, ob es ein weiteres Match gibt.
                </p>
                <div className="row settings-limit-controls">
                  <div className="settings-limit-group">
                    <label className="toggle settings-toggle">
                      <span>Limit aktivieren</span>
                      <input
                        type="checkbox"
                        data-testid="weekly-limit-toggle"
                        checked={!props.allowAllQuestions}
                        onChange={(e) => props.setAllowAllQuestions(!e.target.checked)}
                        disabled={!!pair.weeklyLimitPending || props.isLoadingGroupSettings}
                      />
                    </label>
                    {props.allowAllQuestions ? (
                      <div className="settings-unlimited-state">Alle Fragen erlaubt</div>
                    ) : (
                      <div className="settings-number-field">
                        <input
                          data-testid="weekly-limit-input"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="50"
                          step="1"
                          aria-label="Fragen pro Woche"
                          value={props.weeklyLimitInput}
                          onChange={(e) =>
                            props.setWeeklyLimitInput(e.target.value.replace(/\D/g, ""))
                          }
                          disabled={!!pair.weeklyLimitPending || props.isLoadingGroupSettings}
                        />
                        <span className="settings-number-suffix">Fragen/Woche</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="settings-current-row">
                  <div className="settings-current" data-testid="weekly-limit-current">
                    <span className="settings-current-label">Aktuell</span>
                    <span className="settings-current-value">
                      {pair.weeklyLimit === 0
                        ? "Alle Fragen erlaubt"
                        : `${pair.weeklyLimit} Fragen pro Woche`}
                    </span>
                  </div>
                  <button
                    className="primary settings-propose-button"
                    data-testid="weekly-limit-propose-button"
                    onClick={props.onProposeGroupSettings}
                    disabled={!canProposeSettings}
                  >
                    Änderung vorschlagen
                  </button>
                </div>
              </div>

              {pair.weeklyLimitPending ? (
                <div className="settings-pending-block" data-testid="weekly-limit-pending-block">
                  <div className="settings-item-title">Offene Einstellungsanfrage</div>
                  {pair.weeklyLimitPending.proposedBy === props.identityUserId ? (
                    <div className="request request-panel">
                      <div className="row request-panel-head settings-request-head">
                        <div>
                          <div className="pair-card-name">Fragenlimit pro Woche</div>
                          <div className="pair-card-code mono">
                            {pair.weeklyLimitPending.limit === 0
                              ? "Alle Fragen erlauben"
                              : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                          </div>
                        </div>
                        <button
                          className="secondary action-cancel"
                          data-testid="weekly-limit-cancel-button"
                          onClick={() => props.onRespondGroupSettings("cancel")}
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
                          <div className="pair-card-code mono">
                            {pair.weeklyLimitPending.limit === 0
                              ? "Alle Fragen erlauben"
                              : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                          </div>
                        </div>
                      </div>
                      <div className="row request-actions">
                        <button
                          className="action-accept"
                          data-testid="weekly-limit-accept-button"
                          onClick={() => props.onRespondGroupSettings("accept")}
                          disabled={props.isLoadingGroupSettings}
                        >
                          ✓ Annehmen
                        </button>
                        <button
                          className="action-reject"
                          data-testid="weekly-limit-reject-button"
                          onClick={() => props.onRespondGroupSettings("reject")}
                          disabled={props.isLoadingGroupSettings}
                        >
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
  );
}
