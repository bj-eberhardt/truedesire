import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { goV3AccountDeleted } from "../../../routes";
import { idbSet } from "../../../../storage/idb";
import { useAccountLifecycleModel } from "./useAccountLifecycleModel";
import type { AccountModelOptions } from "./types";

vi.mock("../../../routes", () => ({
  goV3AccountDeleted: vi.fn()
}));

vi.mock("../../../../state/identity", () => ({
  importBackup: vi.fn()
}));

vi.mock("../../../../storage/idb", () => ({
  idbSet: vi.fn(() => Promise.resolve())
}));

type LifecycleModel = ReturnType<typeof useAccountLifecycleModel>;

function baseOptions(overrides: Partial<AccountModelOptions> = {}): AccountModelOptions {
  return {
    apiClient: null,
    bootstrap: vi.fn(() => Promise.resolve()),
    clearGlobalError: vi.fn(),
    clearMatches: vi.fn(),
    clearQuestions: vi.fn(),
    identity: null,
    resetLocalIdentity: vi.fn(() => Promise.resolve()),
    setIdentity: vi.fn(),
    setPair: vi.fn(),
    showNotice: vi.fn(),
    ...overrides
  };
}

async function renderLifecycleModel(options: AccountModelOptions) {
  let current: LifecycleModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: LifecycleModel) => void }) {
    onValue(useAccountLifecycleModel(options));
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
  vi.clearAllMocks();
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

test("deletes only local account state and navigates to the account deleted route", async () => {
  const options = baseOptions();
  const hook = await renderLifecycleModel(options);

  await act(async () => {
    await hook.current.deleteLocalAccount();
  });

  expect(options.clearGlobalError).toHaveBeenCalledOnce();
  expect(options.resetLocalIdentity).toHaveBeenCalledOnce();
  expect(idbSet).toHaveBeenCalledWith("ui:lastPairId", "");
  expect(options.setPair).toHaveBeenCalledWith(null);
  expect(options.clearMatches).toHaveBeenCalledOnce();
  expect(options.clearQuestions).toHaveBeenCalledOnce();
  expect(options.setIdentity).toHaveBeenCalledWith(null);
  expect(goV3AccountDeleted).toHaveBeenCalledOnce();
  await hook.unmount();
});

test("tries server-side deletion before clearing local account state", async () => {
  const deleteMe = vi.fn(() => Promise.resolve({ ok: true }));
  const options = baseOptions({
    apiClient: { auth: { deleteMe } } as unknown as AccountModelOptions["apiClient"]
  });
  const hook = await renderLifecycleModel(options);

  await act(async () => {
    await hook.current.deleteAccount();
  });

  expect(deleteMe).toHaveBeenCalledOnce();
  expect(options.resetLocalIdentity).toHaveBeenCalledOnce();
  expect(goV3AccountDeleted).toHaveBeenCalledOnce();
  await hook.unmount();
});

test("still clears local account state when server-side deletion fails", async () => {
  const deleteMe = vi.fn(() => Promise.reject(new Error("offline")));
  const options = baseOptions({
    apiClient: { auth: { deleteMe } } as unknown as AccountModelOptions["apiClient"]
  });
  const hook = await renderLifecycleModel(options);

  await act(async () => {
    await hook.current.deleteAccount();
  });

  expect(deleteMe).toHaveBeenCalledOnce();
  expect(options.resetLocalIdentity).toHaveBeenCalledOnce();
  expect(options.setIdentity).toHaveBeenCalledWith(null);
  expect(goV3AccountDeleted).toHaveBeenCalledOnce();
  await hook.unmount();
});
