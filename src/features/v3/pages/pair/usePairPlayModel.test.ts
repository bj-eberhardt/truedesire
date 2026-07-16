import { expect, test } from "vitest";
import type { DecryptedQuestion, PairView } from "../../../../types";
import { buildPairPlayState, nextWeeklyResetDateText } from "./pairPlayState";

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

test("returns the next Monday for a Monday date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 13))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});

test("returns the next Monday for a Sunday date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 19))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});

test("returns the upcoming Monday for a mid-week date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 15))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});

function pair(overrides: Partial<PairView> = {}): PairView {
  return {
    id: "pair-1",
    status: "active",
    weeklyLimit: 2,
    confirmA: true,
    confirmB: true,
    me: { id: "user-1", nickname: "Ich", ecdhPublicRawB64: "" },
    partner: { id: "user-2", nickname: "Du", ecdhPublicRawB64: "" },
    ...overrides
  };
}

function question(id: string, createdBy: string, createdAt: number): DecryptedQuestion {
  return {
    id,
    pairId: "pair-1",
    createdBy,
    createdAt,
    blob: { ciphertextB64: "", ivB64: "", aadB64: "", schemaVersion: 1 },
    text: `${id}?`
  };
}

test("builds ordered playable questions and navigation state", () => {
  const state = buildPairPlayState({
    answerSummary: {},
    cardIndex: 0,
    flash: { savedId: null, savedText: null, showSaved: false },
    identityUserId: "user-1",
    pair: pair({ usage: { answeredThisWeek: 0, weeklyLimit: 2 } }),
    pairId: "pair-1",
    questions: [question("old", "user-2", 1), question("new", "user-2", 2)]
  });

  expect(state.ordered.map((item) => item.id)).toEqual(["new", "old"]);
  expect(state.currentQuestion?.id).toBe("new");
  expect(state.canNext).toBe(true);
  expect(state.canPrev).toBe(false);
  expect(state.canAnswerNew).toBe(true);
});

test("hides partner questions when weekly limit is reached but keeps own questions answerable", () => {
  const state = buildPairPlayState({
    answerSummary: {},
    cardIndex: 0,
    flash: { savedId: null, savedText: null, showSaved: false },
    identityUserId: "user-1",
    pair: pair({ usage: { answeredThisWeek: 2, weeklyLimit: 2 } }),
    pairId: "pair-1",
    questions: [question("partner", "user-2", 2), question("mine", "user-1", 1)],
    weeklyResetDateText: "20.7.2026"
  });

  expect(state.ordered.map((item) => item.id)).toEqual(["mine"]);
  expect(state.showLimitNotice).toBe(true);
  expect(state.limitNoticeText).toContain("1 offene Fragen");
});

test("shows saved-only card when the answered card disappeared", () => {
  const state = buildPairPlayState({
    answerSummary: { answered: { total: 2, mine: "yes" } },
    cardIndex: 0,
    flash: { savedId: "answered", savedText: "Gespeichert?", showSaved: true },
    identityUserId: "user-1",
    pair: pair(),
    pairId: "pair-1",
    questions: [question("answered", "user-2", 1)]
  });

  expect(state.showSavedOnlyCard).toBe(true);
  expect(state.visibleQuestionId).toBe("answered");
  expect(state.visibleQuestionText).toBe("Gespeichert?");
});
