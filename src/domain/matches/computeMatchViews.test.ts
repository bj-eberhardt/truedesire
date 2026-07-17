import { expect, test } from "vitest";
import { computeMatchViews, type MatchQuestionInput } from "./computeMatchViews";

function question(overrides: Partial<MatchQuestionInput>): MatchQuestionInput {
  return {
    id: "question-1",
    text: "Frage?",
    createdAt: 1,
    grade: "perfect",
    ...overrides
  };
}

test("maps matched questions without exposing raw answers", () => {
  expect(computeMatchViews([question({})])).toEqual([
    {
      id: "question-1",
      question: "Frage?",
      grade: "perfect"
    }
  ]);
});

test("sorts matches by newest question first", () => {
  expect(
    computeMatchViews([
      question({ id: "old", text: "Alt?", createdAt: 1 }),
      question({ id: "new", text: "Neu?", createdAt: 2 })
    ]).map((match) => match.id)
  ).toEqual(["new", "old"]);
});
