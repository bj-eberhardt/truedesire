import { useEffect, useRef, useState } from "react";
import { goV3Pair } from "../../../../app/routes";
import { usePairWorkspaceContext, useQuestionsContext } from "../../../../app/state";
import type { AnswerChoice } from "../../../../types";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS } from "../../hooks/useSavedFlash";
import { toUserMessage } from "../../lib/errors";

export function useAskQuestionModel() {
  const { route, pair } = usePairWorkspaceContext();
  const { addQuestion } = useQuestionsContext();
  const pairId = route.route.pairId ?? "";
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
    !!pair &&
    pair.status === "active" &&
    !!questionText.trim() &&
    !!questionSelfAnswer &&
    !isSaving;

  async function saveQuestion() {
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
      await addQuestion(text, questionSelfAnswer);
      setAskSuccess(true);
      window.setTimeout(() => {
        goV3Pair(pairId);
      }, ANSWER_SAVED_FLASH_TIMEOUT_MS);
    } catch (e: unknown) {
      setIsSaving(false);
      setAskError(toUserMessage(e));
    }
  }

  return {
    askError,
    askSuccess,
    canSave,
    goBack: () => goV3Pair(pairId),
    isSaving,
    questionInputRef,
    questionSelfAnswer,
    questionText,
    saveQuestion,
    setQuestionSelfAnswer,
    setQuestionText
  };
}

