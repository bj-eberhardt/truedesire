import { useCallback, useEffect, useRef, useState } from "react";

const REQUEST_REFRESH_INITIAL_INTERVAL_MS = 30_000;
const REQUEST_REFRESH_MAX_INTERVAL_MS = 120_000;

function nextRefreshDelayMs(currentDelayMs: number) {
  return Math.min(currentDelayMs * 2, REQUEST_REFRESH_MAX_INTERVAL_MS);
}

export function usePairingRequestRefresh(opts: {
  enabled: boolean;
  refreshRequests: () => Promise<void>;
}) {
  const { enabled, refreshRequests } = opts;
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [nextCheckAt, setNextCheckAt] = useState(
    () => Date.now() + REQUEST_REFRESH_INITIAL_INTERVAL_MS
  );
  const [now, setNow] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshDelayRef = useRef(REQUEST_REFRESH_INITIAL_INTERVAL_MS);
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
      refreshDelayRef.current = REQUEST_REFRESH_INITIAL_INTERVAL_MS;
      setNextCheckAt(Date.now() + refreshDelayRef.current);
    }
  }, [enabled, refreshRequests]);

  const refreshAutomatically = useCallback(async () => {
    if (!enabled) return;
    if (refreshInFlightRef.current) return;
    const delayAfterRefresh = nextRefreshDelayMs(refreshDelayRef.current);
    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    try {
      await refreshRequests();
      setLastCheckedAt(Date.now());
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
      refreshDelayRef.current = delayAfterRefresh;
      setNextCheckAt(Date.now() + delayAfterRefresh);
    }
  }, [enabled, refreshRequests]);

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= nextCheckAt) void refreshAutomatically();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, nextCheckAt, refreshAutomatically]);

  return {
    isRefreshing,
    lastCheckedLabel,
    refreshNow,
    secondsUntilRefresh
  };
}
