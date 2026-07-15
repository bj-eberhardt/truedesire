import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../types";
import { useEffect, useState } from "react";
import { InlineError } from "../components/InlineError";
import { V3View } from "../components/V3View";
import { toUserMessage } from "../lib/errors";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../hooks/useSavedFlash";
import { getOpenQuestions, sortByCreatedAtDesc } from "../lib/questions";

type PlayedPageProps = {
  pairId: string;
  pair: PairView | null;
  questions: DecryptedQuestion[];
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  onBack: () => void;
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>;
};

export function PlayedPage(props: PlayedPageProps) {
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
      await props.onAnswer(questionId, choice);
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
      onBack={props.onBack}
      testId="played-view"
      backTestId="played-back-button"
    >
      {pageError ? <InlineError testId="played-error">{pageError}</InlineError> : null}
      {!props.pair || props.pair.id !== props.pairId ? (
        <div className="empty" data-testid="played-loading-state">
          Verknüpfung wird geladen…
        </div>
      ) : (
        (() => {
          const open = getOpenQuestions(props.questions, props.answerSummary);
          const pending = open.filter((q) => !!props.answerSummary[q.id]?.mine);
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
                const mine = props.answerSummary[pq.id]?.mine;
                const total = props.answerSummary[pq.id]?.total ?? 0;
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
