import { useCallback, useEffect, useRef, useState } from "react";

type UseInlineNoticeResult = {
  notice: string | null;
  showNotice: (message: string, autoCloseMs?: number) => void;
  clearNotice: () => void;
};

export function useInlineNotice(): UseInlineNoticeResult {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearNotice = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setNotice(null);
  }, []);

  const showNotice = useCallback((message: string, autoCloseMs = 1400) => {
    setNotice(message);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setNotice(null);
    }, autoCloseMs);
  }, []);

  useEffect(() => clearNotice, [clearNotice]);

  return { notice, showNotice, clearNotice };
}
