import { useEffect, useRef, useState } from "react";

export function useSavedFlash(opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 650;
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedText, setSavedText] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function begin(id: string, text?: string | null) {
    setIsSaving(true);
    setSavedId(id);
    setSavedText(text ?? null);
    setShowSaved(false);
  }

  function fail() {
    setIsSaving(false);
    setShowSaved(false);
    setSavedId(null);
    setSavedText(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function success(onComplete?: () => void) {
    setShowSaved(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setShowSaved(false);
      setIsSaving(false);
      setSavedId(null);
      setSavedText(null);
      timerRef.current = null;
      onComplete?.();
    }, timeoutMs);
  }

  return { isSaving, showSaved, savedId, savedText, begin, success, fail };
}
