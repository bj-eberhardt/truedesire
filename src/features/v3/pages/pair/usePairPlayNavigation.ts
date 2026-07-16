import { useCallback, useEffect, useState } from "react";

export function usePairPlayNavigation(pairId: string) {
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => setCardIndex(0), [pairId]);

  const goPrev = useCallback((safeIndex: number) => {
    setCardIndex(Math.max(0, safeIndex - 1));
  }, []);

  const goNext = useCallback((safeIndex: number, orderedLength: number) => {
    const lastIndex = Math.max(0, orderedLength - 1);
    setCardIndex(Math.min(lastIndex, safeIndex + 1));
  }, []);

  return { cardIndex, goNext, goPrev };
}
