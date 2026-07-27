import { expect, test } from "vitest";
import type { QuestionView } from "../../../../types";
import { isQuestionVisibleForWeeklyAccess } from "./useQuestionList";
import type { WeeklyQuestionAccess } from "./types";

const weeklyAccess: WeeklyQuestionAccess = {
  weekStart: 1000,
  systemQuestionIds: ["system-current"],
  ownQuestionIds: ["manual-current"]
};

function question(overrides: Partial<QuestionView>): QuestionView {
  return {
    id: "question-1",
    pairId: "pair-1",
    createdBy: "computer",
    createdAt: 1,
    blob: { ciphertextB64: "", ivB64: "", aadB64: "", schemaVersion: 1 },
    ...overrides
  };
}

test("shows current weekly system questions", () => {
  expect(
    isQuestionVisibleForWeeklyAccess(
      question({
        systemQuestionId: "system-current",
        systemWeekStart: weeklyAccess.weekStart
      }),
      weeklyAccess
    )
  ).toBe(true);
});

test("shows allowed own weekly questions", () => {
  expect(
    isQuestionVisibleForWeeklyAccess(
      question({ id: "manual-current", createdBy: "user-1" }),
      weeklyAccess
    )
  ).toBe(true);
});

test("shows old half-answered questions as catch-up questions", () => {
  expect(
    isQuestionVisibleForWeeklyAccess(
      question({ id: "old-half-answered", systemQuestionId: "old-system", systemWeekStart: 1 }),
      weeklyAccess,
      { total: 1, mine: false }
    )
  ).toBe(true);
});

test("hides old questions without partner answers", () => {
  expect(
    isQuestionVisibleForWeeklyAccess(
      question({ id: "old-unanswered", systemQuestionId: "old-system", systemWeekStart: 1 }),
      weeklyAccess,
      { total: 0, mine: false }
    )
  ).toBe(false);
});

test("hides old questions already answered by me", () => {
  expect(
    isQuestionVisibleForWeeklyAccess(
      question({ id: "old-mine", systemQuestionId: "old-system", systemWeekStart: 1 }),
      weeklyAccess,
      { total: 2, mine: true }
    )
  ).toBe(false);
});
