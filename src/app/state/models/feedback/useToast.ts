import { useCallback, useRef, useState } from "react";

export type ToastKind = "default" | "success" | "error";

export type ToastState = {
  message: string;
  kind?: ToastKind;
};

type UseToastResult = {
  toast: ToastState | null;
  showToast: (message: string, kind?: ToastKind) => void;
};

export function useToast(timeoutMs = 1600): UseToastResult {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "default") => {
      setToast({ message, kind });
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setToast(null), timeoutMs);
    },
    [timeoutMs]
  );

  return { toast, showToast };
}

