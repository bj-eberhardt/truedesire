import { useState } from "react";
import type { AnswerChoice, PairView } from "../../../types";
import { InlineError } from "../components/InlineError";
import { V3View } from "../components/V3View";
import { toUserMessage } from "../lib/errors";

type AskPageProps = {
  pairId: string;
  pair: PairView | null;
  onBack: () => void;
  onSave: (text: string, selfAnswer: AnswerChoice) => Promise<void>;
};

export function AskPage(props: AskPageProps) {
  const [questionText, setQuestionText] = useState("");
  const [questionSelfAnswer, setQuestionSelfAnswer] = useState<AnswerChoice | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const canSave =
    !!props.pair && props.pair.status === "active" && !!questionText.trim() && !!questionSelfAnswer;

  return (
    <V3View
      title="Eigene Frage stellen"
      subtitle="Neue Frage erstellen und deine eigene Antwort direkt speichern."
      onBack={props.onBack}
      testId="ask-view"
      backTestId="ask-back-button"
    >
      <label className="field v3-field">
        <span>Frage</span>
        <input
          data-testid="ask-question-input"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="z.B. Möchtest du …"
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
          onClick={async () => {
            setAskError(null);
            const text = questionText.trim();
            if (!text) {
              setAskError("Bitte gib eine Frage ein.");
              return;
            }
            if (!questionSelfAnswer) {
              setAskError("Bitte wähle Ja/Vielleicht/Nein.");
              return;
            }
            try {
              await props.onSave(text, questionSelfAnswer);
            } catch (e: unknown) {
              setAskError(toUserMessage(e));
            }
          }}
          disabled={!canSave}
        >
          Speichern
        </button>
      </div>

      {askError ? <InlineError testId="ask-error">{askError}</InlineError> : null}
    </V3View>
  );
}
