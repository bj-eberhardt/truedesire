import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  GroupSettingsContext,
  MatchesContext,
  PairWorkspaceContext,
  SessionContext
} from "../../../../app/state/AppContexts";
import type {
  GroupSettingsContextValue,
  MatchesContextValue,
  PairWorkspaceContextValue,
  SessionContextValue
} from "../../../../app/state";
import type { PairView } from "../../../../types";
import { usePairPageModel, type PairPageModel } from "./usePairPageModel";

const pair: PairView = {
  id: "pair-1",
  status: "active",
  weeklyLimit: 5,
  weeklyLimitPending: null,
  confirmA: true,
  confirmB: true,
  me: { id: "user-1", nickname: "Ada", code: "AAA111", ecdhPublicRawB64: "pub-a" },
  partner: { id: "user-2", nickname: "Bea", code: "BBB222", ecdhPublicRawB64: "pub-b" }
};

function sessionValue(userId = "user-1"): SessionContextValue {
  return {
    identity: { userId, nickname: "Ada", code: "AAA111" },
    nicknameDraft: "",
    isBootstrappingAccount: false,
    updateNicknameDraft: vi.fn(),
    bootstrapAccount: vi.fn(),
    registerAccount: vi.fn()
  };
}

function workspaceValue(
  routeMode: PairWorkspaceContextValue["route"]["route"]["mode"],
  refreshPairView = vi.fn(() => Promise.resolve())
): PairWorkspaceContextValue {
  return {
    route: { kind: "v3", route: { mode: routeMode, pairId: "pair-1" } },
    pair,
    isLoadingPairData: false,
    openPair: vi.fn(),
    openPairRoute: vi.fn(),
    refreshPairView
  };
}

function matchesValue(computeMatches = vi.fn(() => Promise.resolve())): MatchesContextValue {
  return {
    matches: [],
    isLoadingMatches: false,
    hiddenMatchIds: [],
    showHiddenMatches: false,
    visibleMatchesCount: 0,
    computeMatches,
    hideMatch: vi.fn(),
    restoreMatch: vi.fn(),
    toggleHiddenMatchesView: vi.fn()
  };
}

function groupSettingsValue(
  refreshGroupSettings = vi.fn(() => Promise.resolve())
): GroupSettingsContextValue {
  return {
    weeklyLimitDraft: "5",
    allowAllQuestions: false,
    isLoadingGroupSettings: false,
    updateWeeklyLimitDraft: vi.fn(),
    setQuestionsUnlimited: vi.fn(),
    refreshGroupSettings,
    proposeGroupSettings: vi.fn(),
    respondGroupSettings: vi.fn()
  };
}

async function renderPairPageModel(opts: {
  groupSettings?: GroupSettingsContextValue;
  matches?: MatchesContextValue;
  session?: SessionContextValue;
  workspace: PairWorkspaceContextValue;
}) {
  let current: PairPageModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: PairPageModel) => void }) {
    onValue(usePairPageModel());
    return null;
  }

  function Providers() {
    return React.createElement(
      SessionContext.Provider,
      { value: opts.session ?? sessionValue() },
      React.createElement(
        PairWorkspaceContext.Provider,
        { value: opts.workspace },
        React.createElement(
          MatchesContext.Provider,
          { value: opts.matches ?? matchesValue() },
          React.createElement(
            GroupSettingsContext.Provider,
            { value: opts.groupSettings ?? groupSettingsValue() },
            React.createElement(HookReader, { onValue: (value) => (current = value) })
          )
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
  Object.defineProperty(globalThis, "window", {
    value: { location: { hash: "" } },
    configurable: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("derives active tab from pair subroutes", async () => {
  const playHook = await renderPairPageModel({ workspace: workspaceValue("pair") });
  expect(playHook.current.activeTab).toBe("play");
  expect(playHook.current.showPlay).toBe(true);
  await playHook.unmount();

  const matchesHook = await renderPairPageModel({ workspace: workspaceValue("pairMatches") });
  expect(matchesHook.current.activeTab).toBe("matches");
  expect(matchesHook.current.showMatches).toBe(true);
  await matchesHook.unmount();

  const settingsHook = await renderPairPageModel({ workspace: workspaceValue("pairSettings") });
  expect(settingsHook.current.activeTab).toBe("settings");
  expect(settingsHook.current.showSettings).toBe(true);
  await settingsHook.unmount();
});

test("counts pending settings only when the partner proposed them", async () => {
  const pendingPair = {
    ...pair,
    weeklyLimitPending: { id: "pending-1", proposedBy: "user-2", limit: 2, createdAt: 1 }
  };
  const hook = await renderPairPageModel({
    workspace: { ...workspaceValue("pair"), pair: pendingPair }
  });

  expect(hook.current.pendingSettingsCount).toBe(1);
  await hook.unmount();

  const ownPendingHook = await renderPairPageModel({
    workspace: {
      ...workspaceValue("pair"),
      pair: {
        ...pendingPair,
        weeklyLimitPending: { ...pendingPair.weeklyLimitPending, proposedBy: "user-1" }
      }
    }
  });

  expect(ownPendingHook.current.pendingSettingsCount).toBe(0);
  await ownPendingHook.unmount();
});

test("tab actions change routes and trigger related refresh actions", async () => {
  const computeMatches = vi.fn(() => Promise.resolve());
  const refreshGroupSettings = vi.fn(() => Promise.resolve());
  const refreshPairView = vi.fn(() => Promise.resolve());
  const hook = await renderPairPageModel({
    workspace: workspaceValue("pair", refreshPairView),
    matches: matchesValue(computeMatches),
    groupSettings: groupSettingsValue(refreshGroupSettings)
  });

  act(() => hook.current.switchToMatches());
  expect(window.location.hash).toBe("#/v3/pair/pair-1/matches");
  expect(computeMatches).toHaveBeenCalledTimes(1);

  act(() => hook.current.switchToSettings());
  expect(window.location.hash).toBe("#/v3/pair/pair-1/settings");
  expect(refreshGroupSettings).toHaveBeenCalledTimes(1);

  act(() => hook.current.switchToPlay());
  expect(window.location.hash).toBe("#/v3/pair/pair-1");
  expect(refreshPairView).toHaveBeenCalledTimes(1);

  await hook.unmount();
});
