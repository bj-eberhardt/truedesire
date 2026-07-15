import { useCallback, useState } from "react";
import { useInlineNotice } from "../../../hooks/useInlineNotice";
import type { FeedbackContextValue } from "../../AppContexts";
import { useToast } from "./useToast";

type FeedbackModel = {
  feedback: FeedbackContextValue;
  clearGlobalError: () => void;
  setGlobalError: (message: string | null) => void;
  showNotice: (message: string, autoCloseMs?: number) => void;
};

export function useFeedbackModel(): FeedbackModel {
  const [error, setError] = useState<string | null>(null);
  const { notice: inlineNotice, showNotice } = useInlineNotice();
  const { toast } = useToast(1600);

  const clearGlobalError = useCallback(() => setError(null), []);

  return {
    feedback: {
      toast,
      inlineNotice,
      error,
      setGlobalError: setError,
      clearGlobalError
    },
    clearGlobalError,
    setGlobalError: setError,
    showNotice
  };
}

