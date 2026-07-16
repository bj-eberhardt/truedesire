import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useToast } from "./useToast";

type ToastModel = ReturnType<typeof useToast>;

async function renderToast(timeoutMs = 500) {
  let current: ToastModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: ToastModel) => void }) {
    onValue(useToast(timeoutMs));
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

test("shows a toast and clears it after the configured timeout", async () => {
  const hook = await renderToast(500);

  act(() => hook.current.showToast("Fertig", "success"));
  expect(hook.current.toast).toEqual({ message: "Fertig", kind: "success" });

  act(() => {
    vi.advanceTimersByTime(500);
  });
  expect(hook.current.toast).toBeNull();
  await hook.unmount();
});

test("uses the default toast kind when none is supplied", async () => {
  const hook = await renderToast();

  act(() => hook.current.showToast("Hinweis"));
  expect(hook.current.toast).toEqual({ message: "Hinweis", kind: "default" });
  await hook.unmount();
});
