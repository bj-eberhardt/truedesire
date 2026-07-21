import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useBackupImportDraft } from "./useBackupImportDraft";

type BackupImportDraft = ReturnType<typeof useBackupImportDraft>;

async function renderBackupImportDraft(opts: {
  bootstrapAccount: (opts?: { showLoadingScreen?: boolean }) => Promise<unknown>;
  importBackupText: (txt: string) => Promise<void>;
  setOnboardError: (message: string | null) => void;
}) {
  let current: BackupImportDraft | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: BackupImportDraft) => void }) {
    onValue(useBackupImportDraft(opts));
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
  Object.defineProperty(globalThis, "window", {
    value: { location: { hash: "" } },
    configurable: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("rejects empty and invalid backup text before importing", async () => {
  const importBackupText = vi.fn();
  const bootstrapAccount = vi.fn();
  const setOnboardError = vi.fn();
  const hook = await renderBackupImportDraft({
    bootstrapAccount,
    importBackupText,
    setOnboardError
  });

  await act(async () => {
    await hook.current.submitBackupImport();
  });

  expect(importBackupText).not.toHaveBeenCalled();
  expect(bootstrapAccount).not.toHaveBeenCalled();
  expect(setOnboardError).toHaveBeenCalledWith(
    "Bitte lade eine Backup-Datei hoch oder füge dein Backup-JSON ein."
  );

  act(() => hook.current.setBackupText("{kaputt"));
  await act(async () => {
    await hook.current.submitBackupImport();
  });

  expect(importBackupText).not.toHaveBeenCalled();
  expect(bootstrapAccount).not.toHaveBeenCalled();
  expect(setOnboardError).toHaveBeenLastCalledWith(
    "Der eingefügte Text ist kein valides Backup (ungültiges JSON)."
  );
  await hook.unmount();
});

test("imports valid backup text, starts the account loader, and routes home immediately", async () => {
  let resolveBootstrap!: () => void;
  const bootstrapPromise = new Promise<void>((resolve) => {
    resolveBootstrap = resolve;
  });
  const importBackupText = vi.fn(() => Promise.resolve());
  const bootstrapAccount = vi.fn(() => bootstrapPromise);
  const setOnboardError = vi.fn();
  const hook = await renderBackupImportDraft({
    bootstrapAccount,
    importBackupText,
    setOnboardError
  });

  act(() => hook.current.setBackupText(' { "ok": true } '));

  let submitPromise!: Promise<void>;
  await act(async () => {
    submitPromise = hook.current.submitBackupImport();
  });

  expect(setOnboardError).toHaveBeenCalledWith(null);
  expect(importBackupText).toHaveBeenCalledWith('{ "ok": true }');
  expect(bootstrapAccount).toHaveBeenCalledWith({ showLoadingScreen: true });
  expect(window.location.hash).toBe("#/v3");
  expect(hook.current.backupText).toBe("");
  expect(hook.current.importSuccessVisible).toBe(false);

  await act(async () => {
    resolveBootstrap();
    await submitPromise;
  });

  await hook.unmount();
});

test("stores and clears selected backup file metadata", async () => {
  const hook = await renderBackupImportDraft({
    bootstrapAccount: vi.fn(),
    importBackupText: vi.fn(),
    setOnboardError: vi.fn()
  });
  const file = new File(['{"ok":true}'], "backup.json", { type: "application/json" });

  act(() => hook.current.selectBackupFile(file));
  expect(hook.current.backupFile).toBe(file);
  expect(hook.current.backupFileName).toBe("backup.json");

  act(() => hook.current.clearBackupFileSelection());
  expect(hook.current.backupFile).toBeNull();
  expect(hook.current.backupFileName).toBeNull();
  await hook.unmount();
});
