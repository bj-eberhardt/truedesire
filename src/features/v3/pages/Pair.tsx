import { useEffect, useState } from "react";
import {
  useGroupSettingsContext,
  useMatchesContext,
  usePairWorkspaceContext,
  useQuestionsContext,
  useSessionContext
} from "../../../app/state";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../types";
import {
  goV3,
  goV3Ask,
  goV3Pair,
  goV3PairMatches,
  goV3PairSettings,
  goV3Played
} from "../../../app/routes";
import { V3Notice } from "../components/V3Notice";
import { ChevronLeftIcon } from "../components/icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../components/icons/ChevronRightIcon";
import { CalendarIcon } from "../components/icons/CalendarIcon";
import { ClockIcon } from "../components/icons/ClockIcon";
import { SettingsIcon } from "../components/icons/SettingsIcon";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../hooks/useSavedFlash";
import { useSwipeNav } from "../hooks/useSwipeNav";
import { getOpenQuestions, sortByCreatedAtDesc } from "../lib/questions";
import { PairMatchesTab } from "./pair/PairMatchesTab";
import { PairSettingsTab } from "./pair/PairSettingsTab";

function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toLocaleDateString();
}

export function PairPage() {
  const { identity } = useSessionContext();
  const workspace = usePairWorkspaceContext();
  const questionsContext = useQuestionsContext();
  const matchesContext = useMatchesContext();
  const groupSettings = useGroupSettingsContext();
  const routePairId = workspace.route.route.pairId ?? "";
  const routeMode = workspace.route.route.mode;
  const [cardIndex, setCardIndex] = useState(0);
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });
  const [stablePlayState, setStablePlayState] = useState<{
    pair: PairView;
    questions: DecryptedQuestion[];
    answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  } | null>(null);

  useEffect(() => setCardIndex(0), [routePairId]);

  const props = {
    pairId: routePairId,
    activeTab:
      routeMode === "pairMatches" ? "matches" : routeMode === "pairSettings" ? "settings" : "play",
    identityUserId: identity?.userId ?? "",
    pair: workspace.pair,
    questions: questionsContext.questions,
    answerSummary: questionsContext.answerSummary,
    isLoadingPairData: workspace.isLoadingPairData,
    onAnswer: questionsContext.answerQuestion,
    onAnswerBegin: () => {},
    onAnswerAbort: () => {},
    onAnswerSaved: () => {},
    cardIndex,
    onSetCardIndex: setCardIndex,
    onBack: goV3,
    onRefreshView: workspace.refreshPairView,
    onGoAsk: () => goV3Ask(routePairId),
    onGoPlayed: () => goV3Played(routePairId),
    onComputeMatches: matchesContext.computeMatches,
    onRefreshGroupSettings: groupSettings.refreshGroupSettings
  };

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
            disabled={props.isLoadingPairData}
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
                    neue Antworten geben. Wochenreset am {nextWeeklyResetDateText()}.{" "}
                    <CalendarIcon className="v3-weekly-calendar-icon" />
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

      {showMatches ? <PairMatchesTab /> : null}

      {showSettings ? <PairSettingsTab /> : null}
    </section>
  );
}
