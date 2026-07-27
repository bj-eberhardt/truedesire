import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { usePairingRequestRefresh } from "./usePairingRequestRefresh";

type PairingRequestRefreshModel = ReturnType<typeof usePairingRequestRefresh>;

async function renderPairingRequestRefresh(opts: {
  enabled?: boolean;
  refreshRequests: () => Promise<void>;
}) {
  let current: PairingRequestRefreshModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: PairingRequestRefreshModel) => void }) {
    onValue(
      usePairingRequestRefresh({
        enabled: opts.enabled ?? true,
        refreshRequests: opts.refreshRequests
      })
    );
    return null;
  }

  function Wrapper() {
    return React.createElement(HookReader, {
      onValue: (value) => {
        current = value;
      }
    });
  }

  await act(async () => {
    renderer = create(React.createElement(Wrapper));
  });

  if (!current || !renderer) throw new Error("Hook did not render");

  return {
    get current() {
      if (!current) throw new Error("Hook value missing");
      return current;
    },
    unmount: async () => {
      await act(async () => {
        renderer?.unmount();
      });
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const originalConsoleError = console.error;
  vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
      return;
    }
    originalConsoleError(message, ...args);
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true
  });
  Object.defineProperty(globalThis, "window", {
    value: {
      clearInterval: globalThis.clearInterval,
      setInterval: globalThis.setInterval
    },
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("backs off automatic request refreshes until the two minute maximum", async () => {
  const refreshRequests = vi.fn(() => Promise.resolve());
  const hook = await renderPairingRequestRefresh({ refreshRequests });

  expect(hook.current.secondsUntilRefresh).toBe(30);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(refreshRequests).toHaveBeenCalledTimes(1);
  expect(hook.current.secondsUntilRefresh).toBe(60);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(refreshRequests).toHaveBeenCalledTimes(2);
  expect(hook.current.secondsUntilRefresh).toBe(120);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(120_000);
  });
  expect(refreshRequests).toHaveBeenCalledTimes(3);
  expect(hook.current.secondsUntilRefresh).toBe(120);

  await hook.unmount();
});

test("manual request refresh starts the automatic interval over", async () => {
  const refreshRequests = vi.fn(() => Promise.resolve());
  const hook = await renderPairingRequestRefresh({ refreshRequests });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(hook.current.secondsUntilRefresh).toBe(60);

  await act(async () => {
    await hook.current.refreshNow();
  });
  expect(refreshRequests).toHaveBeenCalledTimes(2);
  expect(hook.current.secondsUntilRefresh).toBe(30);

  await hook.unmount();
});
