import { V3PageError } from "../components/V3PageState";
import { V3View } from "../components/V3View";
import { useAskQuestionModel } from "./ask/useAskQuestionModel";

export function AskPage() {
  const {
    askError,
    askSuccess,
    canSave,
    goBack,
    isSaving,
    questionInputRef,
    questionSelfAnswer,
    questionText,
    saveQuestion,
    setQuestionSelfAnswer,
    setQuestionText
  } = useAskQuestionModel();

  return (
    <V3View
      title="Eigene Frage stellen"
      subtitle="Neue Frage erstellen und deine eigene Antwort direkt speichern. Danach wird die Frage auch deinem Partner angezeigt - ohne dich als Autor zu nennen."
      onBack={goBack}
      testId="ask-view"
      backTestId="ask-back-button"
    >
      <label className="field v3-field">
        <span>Gib deine Frage ein:</span>
        <input
          ref={questionInputRef}
          data-testid="ask-question-input"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="z.B. Möchtest du ..."
        />
      </label>

      <div className="v3-choice-row" role="group" aria-label="Deine Antwort">
        <button
          type="button"
          className={`choice yes ${questionSelfAnswer === "yes" ? "active" : ""}`}
          data-testid="ask-answer-yes-button"
          onClick={() => setQuestionSelfAnswer("yes")}
        >
          Ja
        </button>
        <button
          type="button"
          className={`choice maybe ${questionSelfAnswer === "maybe" ? "active" : ""}`}
          data-testid="ask-answer-maybe-button"
          onClick={() => setQuestionSelfAnswer("maybe")}
        >
          Vielleicht
        </button>
        <button
          type="button"
          className={`choice no ${questionSelfAnswer === "no" ? "active" : ""}`}
          data-testid="ask-answer-no-button"
          onClick={() => setQuestionSelfAnswer("no")}
        >
          Nein
        </button>
      </div>

      <div className="v3-actions">
        <button
          className="primary"
          data-testid="ask-save-button"
          onClick={saveQuestion}
          disabled={!canSave}
        >
          {isSaving ? "Speichert..." : "Speichern"}
        </button>
      </div>

      {askSuccess ? (
        <div className="v3-answer-saved v3-ask-success" data-testid="ask-success">
          Frage wurde gespeichert.
        </div>
      ) : null}
      {askError ? <V3PageError testId="ask-error">{askError}</V3PageError> : null}
    </V3View>
  );
}
