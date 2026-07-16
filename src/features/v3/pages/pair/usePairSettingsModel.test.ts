import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  GroupSettingsContext,
  PairWorkspaceContext,
  SessionContext
} from "../../../../app/state/AppContexts";
import type {
  GroupSettingsContextValue,
  PairWorkspaceContextValue,
  SessionContextValue
} from "../../../../app/state";
import type { PairView } from "../../../../types";
import { usePairSettingsModel, type PairSettingsModel } from "./usePairSettingsModel";

const basePair: PairView = {
  id: "pair-1",
  status: "active",
  weeklyLimit: 5,
  weeklyLimitPending: null,
  confirmA: true,
  confirmB: true,
  me: { id: "user-1", nickname: "Ada", code: "AAA111", ecdhPublicRawB64: "pub-a" },
  partner: { id: "user-2", nickname: "Bea", code: "BBB222", ecdhPublicRawB64: "pub-b" }
};

function sessionValue(): SessionContextValue {
  return {
    identity: { userId: "user-1", nickname: "Ada", code: "AAA111" },
    nicknameDraft: "",
    isBootstrappingAccount: false,
    updateNicknameDraft: vi.fn(),
    bootstrapAccount: vi.fn(),
    registerAccount: vi.fn()
  };
}

function workspaceValue(pair: PairView): PairWorkspaceContextValue {
  return {
    route: { kind: "v3", route: { mode: "pairSettings", pairId: pair.id } },
    pair,
    isLoadingPairData: false,
    openPair: vi.fn(),
    openPairRoute: vi.fn(),
    refreshPairView: vi.fn()
  };
}

function groupSettingsValue(
  overrides: Partial<GroupSettingsContextValue>
): GroupSettingsContextValue {
  return {
    weeklyLimitDraft: "5",
    allowAllQuestions: false,
    isLoadingGroupSettings: false,
    updateWeeklyLimitDraft: vi.fn(),
    setQuestionsUnlimited: vi.fn(),
    refreshGroupSettings: vi.fn(),
    proposeGroupSettings: vi.fn(),
    respondGroupSettings: vi.fn(),
    ...overrides
  };
}

async function renderPairSettingsModel(opts: {
  groupSettings: GroupSettingsContextValue;
  pair?: PairView;
}) {
  let current: PairSettingsModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: PairSettingsModel) => void }) {
    onValue(usePairSettingsModel());
    return null;
  }

  function Providers() {
    return React.createElement(
      SessionContext.Provider,
      { value: sessionValue() },
      React.createElement(
        PairWorkspaceContext.Provider,
        { value: workspaceValue(opts.pair ?? basePair) },
        React.createElement(
          GroupSettingsContext.Provider,
          { value: opts.groupSettings },
          React.createElement(HookReader, { onValue: (value) => (current = value) })
        )
      )
    );
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

test("enables proposing settings only for a valid changed weekly limit", async () => {
  const unchanged = await renderPairSettingsModel({
    groupSettings: groupSettingsValue({ weeklyLimitDraft: "5" })
  });
  expect(unchanged.current.canProposeSettings).toBe(false);
  await unchanged.unmount();

  const changed = await renderPairSettingsModel({
    groupSettings: groupSettingsValue({ weeklyLimitDraft: "3" })
  });
  expect(changed.current.canProposeSettings).toBe(true);
  await changed.unmount();
});

test("disables proposing settings while loading, pending, or invalid", async () => {
  const loading = await renderPairSettingsModel({
    groupSettings: groupSettingsValue({ weeklyLimitDraft: "3", isLoadingGroupSettings: true })
  });
  expect(loading.current.canProposeSettings).toBe(false);
  await loading.unmount();

  const invalid = await renderPairSettingsModel({
    groupSettings: groupSettingsValue({ weeklyLimitDraft: "99" })
  });
  expect(invalid.current.canProposeSettings).toBe(false);
  await invalid.unmount();

  const pending = await renderPairSettingsModel({
    pair: {
      ...basePair,
      weeklyLimitPending: { id: "pending-1", proposedBy: "user-2", limit: 3, createdAt: 1 }
    },
    groupSettings: groupSettingsValue({ weeklyLimitDraft: "3" })
  });
  expect(pending.current.canProposeSettings).toBe(false);
  await pending.unmount();
});

test("detects whether the pending request belongs to the current user", async () => {
  const ownPending = await renderPairSettingsModel({
    pair: {
      ...basePair,
      weeklyLimitPending: { id: "pending-1", proposedBy: "user-1", limit: 3, createdAt: 1 }
    },
    groupSettings: groupSettingsValue({})
  });
  expect(ownPending.current.isOwnPendingRequest).toBe(true);
  await ownPending.unmount();

  const partnerPending = await renderPairSettingsModel({
    pair: {
      ...basePair,
      weeklyLimitPending: { id: "pending-1", proposedBy: "user-2", limit: 3, createdAt: 1 }
    },
    groupSettings: groupSettingsValue({})
  });
  expect(partnerPending.current.isOwnPendingRequest).toBe(false);
  await partnerPending.unmount();
});
