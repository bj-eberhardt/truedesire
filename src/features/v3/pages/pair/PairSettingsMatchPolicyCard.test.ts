import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { PairView } from "../../../../types";
import { PairSettingsMatchPolicyCard } from "./PairSettingsMatchPolicyCard";

const basePair: PairView = {
  id: "pair-1",
  status: "active",
  weeklyLimit: 5,
  weeklyLimitPending: null,
  matchPolicyPending: null,
  confirmA: true,
  confirmB: true,
  me: { id: "user-1", nickname: "Ada", code: "AAA111", ecdhPublicRawB64: "pub-a" },
  partner: { id: "user-2", nickname: "Bea", code: "BBB222", ecdhPublicRawB64: "pub-b" }
};

function renderCard(pair: PairView, overrides = {}) {
  const props = {
    canProposeMatchPolicy: true,
    isLoadingGroupSettings: false,
    isOwnMatchPolicyPending: false,
    matchPolicy: "allowMutualMaybe" as const,
    matchPolicyDraft: "perfectOnly" as const,
    pair,
    onProposeMatchPolicy: vi.fn(),
    onRespondMatchPolicy: vi.fn(),
    onUpdateMatchPolicyDraft: vi.fn(),
    ...overrides
  };
  const rendererRef: { current?: ReactTestRenderer } = {};
  act(() => {
    rendererRef.current = create(React.createElement(PairSettingsMatchPolicyCard, props));
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

test("disables the proposal button when the model says proposing is not allowed", () => {
  const renderer = renderCard(basePair, { canProposeMatchPolicy: false });
  const button = renderer.root.findByProps({ "data-testid": "match-policy-propose-button" });

  expect(button.props.disabled).toBe(true);
});

test("shows withdraw for an own pending proposal", () => {
  const renderer = renderCard(
    {
      ...basePair,
      matchPolicyPending: {
        id: "pending-1",
        proposedBy: "user-1",
        policy: "perfectOnly",
        createdAt: 1
      }
    },
    { isOwnMatchPolicyPending: true }
  );

  expect(renderer.root.findByProps({ "data-testid": "match-policy-cancel-button" })).toBeTruthy();
});

test("shows accept and reject for a partner pending proposal", () => {
  const renderer = renderCard({
    ...basePair,
    matchPolicyPending: {
      id: "pending-1",
      proposedBy: "user-2",
      policy: "perfectOnly",
      createdAt: 1
    }
  });

  expect(renderer.root.findByProps({ "data-testid": "match-policy-accept-button" })).toBeTruthy();
  expect(renderer.root.findByProps({ "data-testid": "match-policy-reject-button" })).toBeTruthy();
});
