import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useCreateAccountFlow } from "./useCreateAccountFlow";

type CreateAccountFlow = ReturnType<typeof useCreateAccountFlow>;

async function renderCreateAccountFlow(opts: {
  bootstrapAccount: () => Promise<{ userId?: string | null } | null>;
  registerAccount: (nickname?: string) => Promise<void>;
  setOnboardError: (message: string | null) => void;
  setOnboardingStep: (step: "start" | "backup" | "new" | "backup-save" | "pairing") => void;
}) {
  let current: CreateAccountFlow | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: CreateAccountFlow) => void }) {
    onValue(useCreateAccountFlow(opts));
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("requires a nickname before registering an account", async () => {
  const registerAccount = vi.fn();
  const setOnboardError = vi.fn();
  const hook = await renderCreateAccountFlow({
    bootstrapAccount: vi.fn(),
    registerAccount,
    setOnboardError,
    setOnboardingStep: vi.fn()
  });

  await act(async () => {
    await hook.current.createAccount("   ");
  });

  expect(registerAccount).not.toHaveBeenCalled();
  expect(setOnboardError).toHaveBeenCalledWith("Bitte gib einen Nickname ein.");
  await hook.unmount();
});

test("registers with trimmed nickname and advances to backup save after hydration", async () => {
  const registerAccount = vi.fn(() => Promise.resolve());
  const setOnboardError = vi.fn();
  const setOnboardingStep = vi.fn();
  const hook = await renderCreateAccountFlow({
    bootstrapAccount: vi.fn(() => Promise.resolve({ userId: "user-1" })),
    registerAccount,
    setOnboardError,
    setOnboardingStep
  });

  await act(async () => {
    await hook.current.createAccount("  Ada  ");
  });

  expect(registerAccount).toHaveBeenCalledWith("Ada");
  expect(setOnboardError).toHaveBeenCalledWith(null);
  expect(setOnboardingStep).toHaveBeenCalledWith("backup-save");
  expect(hook.current.isRegistering).toBe(false);
  await hook.unmount();
});

test("shows an error when the created account cannot be hydrated", async () => {
  const setOnboardError = vi.fn();
  const hook = await renderCreateAccountFlow({
    bootstrapAccount: vi.fn(() => Promise.resolve(null)),
    registerAccount: vi.fn(() => Promise.resolve()),
    setOnboardError,
    setOnboardingStep: vi.fn()
  });

  await act(async () => {
    await hook.current.createAccount("Ada");
  });

  expect(setOnboardError).toHaveBeenLastCalledWith(
    "Konto wurde erstellt, konnte aber noch nicht geladen werden. Bitte erneut versuchen."
  );
  await hook.unmount();
});
