import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useInlineNotice } from "./useInlineNotice";

type InlineNotice = ReturnType<typeof useInlineNotice>;

async function renderInlineNotice() {
  let current: InlineNotice | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: InlineNotice) => void }) {
    onValue(useInlineNotice());
    return null;
  }

  await act(async () => {
    renderer = create(React.createElement(HookReader, { onValue: (value) => (current = value) }));
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
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout
    },
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("shows and auto-clears inline notices", async () => {
  const hook = await renderInlineNotice();

  act(() => hook.current.showNotice("Gespeichert", 500));
  expect(hook.current.notice).toBe("Gespeichert");

  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(hook.current.notice).toBeNull();
  await hook.unmount();
});

test("clears previous notice timers when a new notice is shown", async () => {
  const hook = await renderInlineNotice();

  act(() => hook.current.showNotice("Alt", 500));
  act(() => hook.current.showNotice("Neu", 1000));
  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(hook.current.notice).toBe("Neu");

  act(() => hook.current.clearNotice());
  expect(hook.current.notice).toBeNull();
  await hook.unmount();
});
