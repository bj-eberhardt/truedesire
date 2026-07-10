import { useEffect, useRef, useState } from "react";
import type { AnswerChoice, PairView } from "../../../types";
import { InlineError } from "../components/InlineError";
import { V3View } from "../components/V3View";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS } from "../hooks/useSavedFlash";
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
  const [askSuccess, setAskSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const questionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    questionInputRef.current?.focus();
  }, []);

  const canSave =
    !!props.pair &&
    props.pair.status === "active" &&
    !!questionText.trim() &&
    !!questionSelfAnswer &&
    !isSaving;

  return (
    <V3View
      title="Eigene Frage stellen"
      subtitle="Neue Frage erstellen und deine eigene Antwort direkt speichern. Danach wird die Frage auch deinem Partner angezeigt - ohne dich als Autor zu nennen."
      onBack={props.onBack}
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
              setIsSaving(true);
              await props.onSave(text, questionSelfAnswer);
              setAskSuccess(true);
              window.setTimeout(() => {
                props.onBack();
              }, ANSWER_SAVED_FLASH_TIMEOUT_MS);
            } catch (e: unknown) {
              setIsSaving(false);
              setAskError(toUserMessage(e));
            }
          }}
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
      {askError ? <InlineError testId="ask-error">{askError}</InlineError> : null}
    </V3View>
  );
}
