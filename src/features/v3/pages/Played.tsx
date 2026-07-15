import { useEffect, useState } from "react";
import { goV3Pair } from "../../../app/routes";
import { usePairWorkspaceContext, useQuestionsContext } from "../../../app/state";
import type { AnswerChoice } from "../../../types";
import { V3LoadingState, V3PageError } from "../components/V3PageState";
import { V3View } from "../components/V3View";
import { toUserMessage } from "../lib/errors";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../hooks/useSavedFlash";
import { getOpenQuestions, sortByCreatedAtDesc } from "../lib/questions";

export function PlayedPage() {
  const { route, pair } = usePairWorkspaceContext();
  const { questions, answerSummary, answerQuestion } = useQuestionsContext();
  const pairId = route.route.pairId ?? "";
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  async function handleAnswer(questionId: string, questionText: string, choice: AnswerChoice) {
    if (flash.isSaving) return;
    try {
      setPageError(null);
      flash.begin(questionId, questionText);
      await answerQuestion(questionId, choice);
      flash.success();
    } catch (e: unknown) {
      flash.fail();
      setPageError(toUserMessage(e));
    }
  }

  return (
    <V3View
      title="Deine änderbaren Antworten"
      subtitle="Du kannst Antworten hier noch anpassen, solange dein Partner die gleiche Frage noch nicht beantwortet hat."
      onBack={() => goV3Pair(pairId)}
      testId="played-view"
      backTestId="played-back-button"
    >
      {pageError ? <V3PageError testId="played-error">{pageError}</V3PageError> : null}
      {!pair || pair.id !== pairId ? (
        <V3LoadingState testId="played-loading-state">Verknüpfung wird geladen…</V3LoadingState>
      ) : (
        (() => {
          const open = getOpenQuestions(questions, answerSummary);
          const pending = open.filter((q) => !!answerSummary[q.id]?.mine);
          const orderedPending = sortByCreatedAtDesc(pending);
          if (!orderedPending.length)
            return (
              <div className="empty" data-testid="played-empty-state">
                Du hast aktuell keine Antworten mit offenem Partner-Status.
              </div>
            );
          return (
            <div className="v3-played-list" data-testid="played-list">
              {orderedPending.map((pq) => {
                const mine = answerSummary[pq.id]?.mine;
                const total = answerSummary[pq.id]?.total ?? 0;
                const locked = total >= 2;
                const isSavedCard = flash.showSaved && flash.savedId === pq.id;
                return (
                  <div
                    className="v3-play-card"
                    data-testid="played-card"
                    data-question-id={pq.id}
                    key={pq.id}
                    data-saved={isSavedCard ? "true" : "false"}
                  >
                    <div className="v3-play-question" data-testid="played-question-text">
                      {isSavedCard ? (flash.savedText ?? pq.text) : pq.text}
                    </div>
                    {isSavedCard ? (
                      <div className="v3-answer-saved" data-testid="played-saved-indicator">
                        Frage wurde beantwortet.
                      </div>
                    ) : null}
                    <div className="v3-choice-row v3-played-choice-row">
                      <button
                        className={`choice yes ${mine === "yes" ? "active" : ""}`}
                        data-testid="played-answer-yes-button"
                        onClick={() => handleAnswer(pq.id, pq.text, "yes")}
                        disabled={locked || flash.isSaving}
                      >
                        Ja
                      </button>
                      <button
                        className={`choice maybe ${mine === "maybe" ? "active" : ""}`}
                        data-testid="played-answer-maybe-button"
                        onClick={() => handleAnswer(pq.id, pq.text, "maybe")}
                        disabled={locked || flash.isSaving}
                      >
                        Vielleicht
                      </button>
                      <button
                        className={`choice no ${mine === "no" ? "active" : ""}`}
                        data-testid="played-answer-no-button"
                        onClick={() => handleAnswer(pq.id, pq.text, "no")}
                        disabled={locked || flash.isSaving}
                      >
                        Nein
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </V3View>
  );
}
