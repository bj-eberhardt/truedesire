import { expect, test } from "vitest";
import type { PairView } from "../../../../types";
import {
  allowsAllQuestions,
  getEffectiveWeeklyLimit,
  isAnswerLimitReached,
  validateWeeklyLimitDraft,
  weeklyLimitDraftFromPair
} from "./groupSettingsState";

function pair(overrides: Partial<PairView> = {}): PairView {
  return {
    id: "pair-1",
    status: "active",
    weeklyLimit: 15,
    confirmA: true,
    confirmB: true,
    me: { id: "me", nickname: "Me", ecdhPublicRawB64: "" },
    partner: { id: "partner", nickname: "Partner", ecdhPublicRawB64: "" },
    ...overrides
  };
}

test("derives group settings state from pair usage", () => {
  const currentPair = pair({ usage: { weeklyLimit: 0, answeredThisWeek: 20 } });

  expect(getEffectiveWeeklyLimit(currentPair)).toBe(0);
  expect(allowsAllQuestions(currentPair)).toBe(true);
  expect(weeklyLimitDraftFromPair(currentPair)).toBe("15");
  expect(isAnswerLimitReached(currentPair)).toBe(false);
});

test("detects reached answer limit", () => {
  expect(isAnswerLimitReached(pair({ usage: { weeklyLimit: 2, answeredThisWeek: 2 } }))).toBe(true);
});

test("validates weekly limit drafts", () => {
  expect(validateWeeklyLimitDraft({ allowAllQuestions: true, weeklyLimitDraft: "x" })).toEqual({
    ok: true,
    limit: 0
  });
  expect(validateWeeklyLimitDraft({ allowAllQuestions: false, weeklyLimitDraft: "10" })).toEqual({
    ok: true,
    limit: 10
  });
  expect(validateWeeklyLimitDraft({ allowAllQuestions: false, weeklyLimitDraft: "abc" })).toEqual({
    ok: false,
    reason: "not_a_number"
  });
  expect(validateWeeklyLimitDraft({ allowAllQuestions: false, weeklyLimitDraft: "51" })).toEqual({
    ok: false,
    reason: "out_of_range"
  });
});
