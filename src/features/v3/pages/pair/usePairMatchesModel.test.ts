import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MatchesContext } from "../../../../app/state/AppContexts";
import type { MatchesContextValue } from "../../../../app/state";
import type { MatchView } from "../../../../domain/matches/computeMatchViews";
import { usePairMatchesModel, type PairMatchesModel } from "./usePairMatchesModel";

const matches: MatchView[] = [
  { id: "match-1", question: "A?", grade: "perfect", answers: ["yes", "yes"] },
  { id: "match-2", question: "B?", grade: "maybe", answers: ["yes", "maybe"] }
];

function matchesValue(overrides: Partial<MatchesContextValue>): MatchesContextValue {
  return {
    matches,
    isLoadingMatches: false,
    hiddenMatchIds: ["match-2"],
    showHiddenMatches: false,
    visibleMatchesCount: 1,
    computeMatches: vi.fn(),
    hideMatch: vi.fn(),
    restoreMatch: vi.fn(),
    toggleHiddenMatchesView: vi.fn(),
    ...overrides
  };
}

async function renderPairMatchesModel(value: MatchesContextValue) {
  let current: PairMatchesModel | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: PairMatchesModel) => void }) {
    onValue(usePairMatchesModel());
    return null;
  }

  await act(async () => {
    renderer = create(
      React.createElement(
        MatchesContext.Provider,
        { value },
        React.createElement(HookReader, { onValue: (value) => (current = value) })
      )
    );
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

test("shows only non-hidden matches in the default view", async () => {
  const hook = await renderPairMatchesModel(matchesValue({ showHiddenMatches: false }));

  expect(hook.current.hiddenCount).toBe(1);
  expect(hook.current.visibleMatches.map((match) => match.id)).toEqual(["match-1"]);
  expect(hook.current.showHiddenMatchesDisabled).toBe(false);

  await hook.unmount();
});

test("shows only hidden matches in the hidden matches view", async () => {
  const hook = await renderPairMatchesModel(matchesValue({ showHiddenMatches: true }));

  expect(hook.current.visibleMatches.map((match) => match.id)).toEqual(["match-2"]);

  await hook.unmount();
});

test("disables hidden matches toggle when there are no hidden matches", async () => {
  const hook = await renderPairMatchesModel(
    matchesValue({ hiddenMatchIds: [], visibleMatchesCount: matches.length })
  );

  expect(hook.current.hiddenCount).toBe(0);
  expect(hook.current.showHiddenMatchesDisabled).toBe(true);
  expect(hook.current.visibleMatches.map((match) => match.id)).toEqual(["match-1", "match-2"]);

  await hook.unmount();
});
