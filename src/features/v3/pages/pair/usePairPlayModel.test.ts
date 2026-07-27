import { expect, test } from "vitest";
import type { DecryptedQuestion, PairView } from "../../../../types";
import {
  buildPairPlayState,
  buildPartnerWeeklyProgressMessage,
  nextWeeklyResetDateText
} from "./pairPlayState";

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
  expect(state.partnerWeeklyProgressMessage).toEqual({
    count: null,
    leadingText:
      "Dein Partner hat noch nichts geantwortet. Deine Chance, der Erste zu sein und Fragen zu beantworten.",
    trailingText: ""
  });
});

test("builds partner weekly progress message variants", () => {
  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 0,
      isUnlimited: false,
      partnerAnsweredThisWeek: 0,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText:
      "Dein Partner hat noch nichts geantwortet. Deine Chance, der Erste zu sein und Fragen zu beantworten.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 0,
      isUnlimited: false,
      partnerAnsweredThisWeek: 1,
      weeklyLimit: 6
    })
  ).toEqual({
    count: 1,
    leadingText: "Du musst noch mindestens",
    trailingText:
      "Frage beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 1,
      isUnlimited: false,
      partnerAnsweredThisWeek: 1,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText:
      "Ihr seid gleichauf. Wenn du noch mindestens eine Frage beantwortest, bist du besser als dein Partner.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 4,
      isUnlimited: false,
      partnerAnsweredThisWeek: 2,
      weeklyLimit: 6
    })
  ).toEqual({
    count: 2,
    leadingText: "Dein Partner hat diese Woche",
    trailingText: "Fragen beantwortet."
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 6,
      isUnlimited: false,
      partnerAnsweredThisWeek: 4,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText:
      "Du hast alle Wochenfragen beantwortet, dein Partner aber nicht. Lass ihn es wissen und ermuntere ihn, auch Fragen zu beantworten.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 2,
      isUnlimited: false,
      partnerAnsweredThisWeek: 4,
      weeklyLimit: 6
    })
  ).toEqual({
    count: 2,
    leadingText: "Du musst noch mindestens",
    trailingText:
      "Fragen beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 4,
      isUnlimited: false,
      partnerAnsweredThisWeek: 4,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText:
      "Ihr seid gleichauf. Wenn du noch mindestens eine Frage beantwortest, bist du besser als dein Partner.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 6,
      isUnlimited: false,
      partnerAnsweredThisWeek: 6,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText: "Ihr seid gleichauf.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 0,
      isUnlimited: false,
      partnerAnsweredThisWeek: 5,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText:
      "Du musst dich ranhalten, dein Partner hat schon fast alle Wochenfragen beantwortet.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 0,
      isUnlimited: false,
      partnerAnsweredThisWeek: 6,
      weeklyLimit: 6
    })
  ).toEqual({
    count: null,
    leadingText: "Du musst dich ranhalten, dein Partner hat bereits alle Wochenfragen beantwortet.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 2,
      isUnlimited: true,
      partnerAnsweredThisWeek: 5,
      weeklyLimit: 0
    })
  ).toEqual({
    count: 3,
    leadingText: "Du musst noch mindestens",
    trailingText:
      "Fragen beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 5,
      isUnlimited: true,
      partnerAnsweredThisWeek: 5,
      weeklyLimit: 0
    })
  ).toEqual({
    count: null,
    leadingText: "Ihr seid gleichauf.",
    trailingText: ""
  });

  expect(
    buildPartnerWeeklyProgressMessage({
      answeredThisWeek: 8,
      isUnlimited: true,
      partnerAnsweredThisWeek: 5,
      weeklyLimit: 0
    })
  ).toEqual({
    count: 5,
    leadingText: "Dein Partner hat diese Woche",
    trailingText: "Fragen beantwortet."
  });
});

test("exposes partner weekly progress message from pair usage", () => {
  const base = {
    answerSummary: {},
    cardIndex: 0,
    flash: { savedId: null, savedText: null, showSaved: false },
    identityUserId: "user-1",
    pairId: "pair-1",
    questions: []
  };

  expect(
    buildPairPlayState({
      ...base,
      pair: pair({ usage: { answeredThisWeek: 0, partnerAnsweredThisWeek: 1, weeklyLimit: 6 } })
    }).partnerWeeklyProgressMessage
  ).toEqual({
    count: 1,
    leadingText: "Du musst noch mindestens",
    trailingText: "Frage beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
  });

  expect(
    buildPairPlayState({
      ...base,
      pair: pair({ usage: { answeredThisWeek: 6, partnerAnsweredThisWeek: 4, weeklyLimit: 6 } })
    }).partnerWeeklyProgressMessage
  ).toEqual({
    count: null,
    leadingText:
      "Du hast alle Wochenfragen beantwortet, dein Partner aber nicht. Lass ihn es wissen und ermuntere ihn, auch Fragen zu beantworten.",
    trailingText: ""
  });

  expect(
    buildPairPlayState({
      ...base,
      pair: pair({ usage: { answeredThisWeek: 0, partnerAnsweredThisWeek: 6, weeklyLimit: 6 } })
    }).partnerWeeklyProgressMessage
  ).toEqual({
    count: null,
    leadingText: "Du musst dich ranhalten, dein Partner hat bereits alle Wochenfragen beantwortet.",
    trailingText: ""
  });

  expect(
    buildPairPlayState({
      ...base,
      pair: pair({
        weeklyLimit: 0,
        usage: { answeredThisWeek: 12, partnerAnsweredThisWeek: 8, weeklyLimit: 0 }
      })
    }).partnerWeeklyProgressMessage
  ).toEqual({
    count: 8,
    leadingText: "Dein Partner hat diese Woche",
    trailingText: "Fragen beantwortet."
  });
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
