import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AccountContext, SessionContext } from "../../../../app/state/AppContexts";
import type { AccountContextValue, SessionContextValue } from "../../../../app/state";
import { useBackupExportViewModel } from "./useBackupExportViewModel";

type BackupExportViewModel = ReturnType<typeof useBackupExportViewModel>;

const sessionValue: SessionContextValue = {
  identity: { userId: "user-1", nickname: "Ada", code: "ABC123" },
  nicknameDraft: "",
  isBootstrappingAccount: false,
  updateNicknameDraft: vi.fn(),
  bootstrapAccount: vi.fn(),
  registerAccount: vi.fn()
};

function accountValue(exportBackupText: () => Promise<string>): AccountContextValue {
  return {
    copyPairingCode: vi.fn(),
    exportBackupText,
    importBackupText: vi.fn(),
    deleteLocalAccount: vi.fn(),
    deleteAccount: vi.fn()
  };
}

async function renderBackupExportViewModel(exportBackupText: () => Promise<string>) {
  let renderer: ReactTestRenderer | null = null;
  let current: BackupExportViewModel | null = null;

  function Providers() {
    return React.createElement(
      SessionContext.Provider,
      { value: sessionValue },
      React.createElement(
        AccountContext.Provider,
        { value: accountValue(exportBackupText) },
        React.createElement(HookReader, { onValue: (value) => (current = value) })
      )
    );
  }

  function HookReader({ onValue }: { onValue: (value: BackupExportViewModel) => void }) {
    onValue(useBackupExportViewModel());
    return null;
  }

  await act(async () => {
    renderer = create(React.createElement(Providers));
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

test("loads exported backup text and clears copied status after clipboard feedback timeout", async () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText } },
    configurable: true
  });

  const hook = await renderBackupExportViewModel(async () => '{"version":1,"payload":true}');

  expect(hook.current.isLoading).toBe(false);
  expect(hook.current.error).toBeNull();
  expect(hook.current.backupText).toContain('"version": 1');
  expect(hook.current.filename).toContain("ABC123");

  await act(async () => {
    await hook.current.copyBackupText();
  });

  expect(writeText).toHaveBeenCalledWith(hook.current.backupText);
  expect(hook.current.copied).toBe(true);

  act(() => {
    vi.advanceTimersByTime(1400);
  });

  expect(hook.current.copied).toBe(false);
  await hook.unmount();
});

test("exposes export errors and stops loading", async () => {
  const hook = await renderBackupExportViewModel(async () => {
    throw new Error("Backup kaputt");
  });

  expect(hook.current.isLoading).toBe(false);
  expect(hook.current.error).toBe("Backup kaputt");
  expect(hook.current.backupText).toBe("");
  await hook.unmount();
});
