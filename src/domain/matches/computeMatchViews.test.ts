import { expect, test } from "vitest";
import { computeMatchViews, type MatchQuestionInput } from "./computeMatchViews";

function question(overrides: Partial<MatchQuestionInput>): MatchQuestionInput {
  return {
    id: "question-1",
    text: "Frage?",
    createdAt: 1,
    answers: ["yes", "yes"],
    ...overrides
  };
}

test("grades yes/yes answers as a perfect match", () => {
  expect(computeMatchViews([question({ answers: ["yes", "yes"] })])).toEqual([
    {
      id: "question-1",
      question: "Frage?",
      grade: "perfect",
      answers: ["yes", "yes"]
    }
  ]);
});

test("grades yes/maybe answers as a maybe match", () => {
  expect(computeMatchViews([question({ answers: ["yes", "maybe"] })])).toEqual([
    {
      id: "question-1",
      question: "Frage?",
      grade: "maybe",
      answers: ["yes", "maybe"]
    }
  ]);
});

test("excludes questions when any answer is no", () => {
  expect(computeMatchViews([question({ answers: ["yes", "no"] })])).toEqual([]);
});

test("excludes questions with fewer than two answers", () => {
  expect(computeMatchViews([question({ answers: ["yes"] })])).toEqual([]);
});

test("sorts matches by newest question first", () => {
  expect(
    computeMatchViews([
      question({ id: "old", text: "Alt?", createdAt: 1 }),
      question({ id: "new", text: "Neu?", createdAt: 2 })
    ]).map((match) => match.id)
  ).toEqual(["new", "old"]);
});
