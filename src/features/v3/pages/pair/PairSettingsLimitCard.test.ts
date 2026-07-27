import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { PairView } from "../../../../types";
import { PairSettingsLimitCard } from "./PairSettingsLimitCard";

const basePair: PairView = {
  id: "pair-1",
  status: "active",
  weeklyLimit: 10,
  weeklyLimitPending: null,
  matchPolicyPending: null,
  confirmA: true,
  confirmB: true,
  me: { id: "user-1", nickname: "Ada", code: "AAA111", ecdhPublicRawB64: "pub-a" },
  partner: { id: "user-2", nickname: "Bea", code: "BBB222", ecdhPublicRawB64: "pub-b" }
};

function renderCard(overrides: Partial<React.ComponentProps<typeof PairSettingsLimitCard>> = {}) {
  const props: React.ComponentProps<typeof PairSettingsLimitCard> = {
    allowAllQuestions: false,
    canProposeWeeklyLimit: true,
    isLoadingGroupSettings: false,
    isOwnWeeklyLimitPending: false,
    pair: basePair,
    weeklyLimitDraft: "8",
    onProposeGroupSettings: vi.fn(),
    onRespondGroupSettings: vi.fn(),
    onSetQuestionsUnlimited: vi.fn(),
    onUpdateWeeklyLimitDraft: vi.fn(),
    ...overrides
  };
  const rendererRef: { current?: ReactTestRenderer } = {};
  act(() => {
    rendererRef.current = create(React.createElement(PairSettingsLimitCard, props));
  });
  if (!rendererRef.current) throw new Error("Card did not render");
  return rendererRef.current;
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

test("shows a warning when lowering the weekly limit", () => {
  const renderer = renderCard();

  expect(
    renderer.root.findByProps({ "data-testid": "weekly-limit-decrease-warning" })
  ).toBeTruthy();
});

test("shows a warning when increasing the weekly limit", () => {
  const renderer = renderCard({ weeklyLimitDraft: "12" });

  expect(renderer.root.findByProps({ "data-id": "weekly-limit-change-warning" })).toBeTruthy();
});

test("does not show the warning when the weekly limit is unchanged", () => {
  const renderer = renderCard({ weeklyLimitDraft: "10" });

  expect(() => renderer.root.findByProps({ "data-id": "weekly-limit-change-warning" })).toThrow();
});

test("shows the warning when changing unlimited questions to a limit", () => {
  const renderer = renderCard({
    pair: { ...basePair, weeklyLimit: 0 },
    weeklyLimitDraft: "10"
  });

  expect(
    renderer.root.findByProps({ "data-testid": "weekly-limit-decrease-warning" })
  ).toBeTruthy();
});
