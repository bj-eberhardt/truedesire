import { useCallback, useEffect, useRef, useState } from "react";

const REQUEST_REFRESH_INTERVAL_MS = 30_000;

export function usePairingRequestRefresh(opts: {
  enabled: boolean;
  refreshRequests: () => Promise<void>;
}) {
  const { enabled, refreshRequests } = opts;
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [nextCheckAt, setNextCheckAt] = useState(() => Date.now() + REQUEST_REFRESH_INTERVAL_MS);
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const secondsUntilRefresh = Math.max(0, Math.ceil((nextCheckAt - now) / 1000));
  const lastCheckedLabel = lastCheckedAt
    ? new Date(lastCheckedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "noch nicht geprüft";

  const refreshNow = useCallback(async () => {
    if (!enabled) return;
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    try {
      await refreshRequests();
      setLastCheckedAt(Date.now());
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
      setNextCheckAt(Date.now() + REQUEST_REFRESH_INTERVAL_MS);
    }
  }, [enabled, refreshRequests]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= nextCheckAt) void refreshNow();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, nextCheckAt, refreshNow]);

  return {
    isRefreshing,
    lastCheckedLabel,
    refreshNow,
    secondsUntilRefresh
  };
}
