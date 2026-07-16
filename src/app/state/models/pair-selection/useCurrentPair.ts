import { useCallback, useEffect, useState } from "react";
import type { PairView } from "../../../../types";
import {
  allowsAllQuestions,
  isAnswerLimitReached,
  weeklyLimitDraftFromPair
} from "./groupSettingsState";

export function useCurrentPair() {
  const [pair, setPair] = useState<PairView | null>(null);
  const [weeklyLimitInput, setWeeklyLimitInput] = useState("15");
  const [allowAllQuestions, setAllowAllQuestions] = useState(false);
  const [answerLimitReached, setAnswerLimitReached] = useState(false);

  const syncGroupSettingsFromPair = useCallback((nextPair: PairView) => {
    setWeeklyLimitInput(weeklyLimitDraftFromPair(nextPair));
    setAllowAllQuestions(allowsAllQuestions(nextPair));
    setAnswerLimitReached(isAnswerLimitReached(nextPair));
  }, []);

  useEffect(() => {
    if (!pair) return;
    syncGroupSettingsFromPair(pair);
  }, [pair, syncGroupSettingsFromPair]);

  return {
    allowAllQuestions,
    answerLimitReached,
    pair,
    setAllowAllQuestions,
    setPair,
    setWeeklyLimitInput,
    syncGroupSettingsFromPair,
    weeklyLimitInput
  };
}
