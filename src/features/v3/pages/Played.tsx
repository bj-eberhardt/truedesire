import { AnswerChoiceGroup, V3LoadingState, V3PageError, V3View } from "../components";
import { usePlayedAnswersModel } from "./played/usePlayedAnswersModel";

export function PlayedPage() {
  const played = usePlayedAnswersModel();

  return (
    <V3View
      title="Deine änderbaren Antworten"
      subtitle="Du kannst Antworten hier noch anpassen, solange dein Partner die gleiche Frage noch nicht beantwortet hat."
      onBack={played.goBack}
      testId="played-view"
      backTestId="played-back-button"
    >
      {played.pageError ? (
        <V3PageError testId="played-error">{played.pageError}</V3PageError>
      ) : null}
      {!played.isPairReady ? (
        <V3LoadingState testId="played-loading-state">Verknüpfung wird geladen...</V3LoadingState>
      ) : played.orderedPendingQuestions.length ? (
        <div className="v3-played-list" data-testid="played-list">
          {played.orderedPendingQuestions.map((pq) => {
            const mine = played.answerSummary[pq.id]?.mine;
            const total = played.answerSummary[pq.id]?.total ?? 0;
            const locked = total >= 2;
            const isSavedCard = played.flash.showSaved && played.flash.savedId === pq.id;
            return (
              <div
                className="v3-play-card"
                data-testid="played-card"
                data-question-id={pq.id}
                key={pq.id}
                data-saved={isSavedCard ? "true" : "false"}
              >
                <div className="v3-play-question" data-testid="played-question-text">
                  {isSavedCard ? (played.flash.savedText ?? pq.text) : pq.text}
                </div>
                {isSavedCard ? (
                  <div className="v3-answer-saved" data-testid="played-saved-indicator">
                    Frage wurde beantwortet.
                  </div>
                ) : null}
                <AnswerChoiceGroup
                  className="v3-played-choice-row"
                  value={mine}
                  onSelect={(answer) => played.answerPendingQuestion(pq.id, pq.text, answer)}
                  disabled={locked || played.flash.isSaving}
                  testIdPrefix="played-answer"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty" data-testid="played-empty-state">
          Du hast aktuell keine Antworten mit offenem Partner-Status.
        </div>
      )}
    </V3View>
  );
}
