import { useCallback, useEffect, useRef, useState } from "react";

export type PairPlayNavDirection = "prev" | "next";
export type PairPlayNavAnimationState = "idle" | "leaving" | "entering";

const CARD_NAV_DURATION_MS = 180;

export function usePairPlayNavigation(pairId: string) {
  const [cardIndex, setCardIndex] = useState(0);
  const [animation, setAnimation] = useState<{
    direction: PairPlayNavDirection;
    state: PairPlayNavAnimationState;
  } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearAnimationTimeout = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => {
    clearAnimationTimeout();
    setAnimation(null);
    setCardIndex(0);
  }, [clearAnimationTimeout, pairId]);

  useEffect(() => clearAnimationTimeout, [clearAnimationTimeout]);

  const navigate = useCallback(
    (direction: PairPlayNavDirection, nextIndex: number, safeIndex: number) => {
      if (animation) return;
      if (nextIndex === safeIndex) return;
      clearAnimationTimeout();
      setAnimation({ direction, state: "leaving" });
      timeoutRef.current = window.setTimeout(() => {
        setCardIndex(nextIndex);
        setAnimation({ direction, state: "entering" });
        timeoutRef.current = window.setTimeout(() => {
          setAnimation(null);
          timeoutRef.current = null;
        }, CARD_NAV_DURATION_MS);
      }, CARD_NAV_DURATION_MS);
    },
    [animation, clearAnimationTimeout]
  );

  const goPrev = useCallback(
    (safeIndex: number) => {
      navigate("prev", Math.max(0, safeIndex - 1), safeIndex);
    },
    [navigate]
  );

  const goNext = useCallback(
    (safeIndex: number, orderedLength: number) => {
      const lastIndex = Math.max(0, orderedLength - 1);
      navigate("next", Math.min(lastIndex, safeIndex + 1), safeIndex);
    },
    [navigate]
  );

  return {
    animationDirection: animation?.direction ?? null,
    animationState: animation?.state ?? "idle",
    cardIndex,
    goNext,
    goPrev,
    isAnimating: animation?.state === "leaving"
  };
}
