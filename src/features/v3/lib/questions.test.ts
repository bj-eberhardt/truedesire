import { expect, test } from "vitest";
import type { DecryptedQuestion } from "../../../types";
import { getOpenQuestions, sortByCreatedAtDesc } from "./questions";

function question(id: string, createdAt: number): DecryptedQuestion {
  return {
    id,
    pairId: "pair-1",
    createdBy: "user-1",
    createdAt,
    blob: {
      ciphertextB64: "",
      ivB64: "",
      aadB64: "",
      schemaVersion: 1
    },
    text: `${id}?`
  };
}

test("sorts questions by newest creation timestamp first without mutating input", () => {
  const oldQuestion = question("old", 1);
  const newQuestion = question("new", 3);
  const middleQuestion = question("middle", 2);
  const input = [oldQuestion, newQuestion, middleQuestion];

  expect(sortByCreatedAtDesc(input).map((item) => item.id)).toEqual(["new", "middle", "old"]);
  expect(input.map((item) => item.id)).toEqual(["old", "new", "middle"]);
});

test("returns questions with fewer than two total answers as open", () => {
  const openUnanswered = question("open-unanswered", 1);
  const openMine = question("open-mine", 2);
  const closed = question("closed", 3);

  expect(
    getOpenQuestions([openUnanswered, openMine, closed], {
      "open-mine": { total: 1, mine: "yes" },
      closed: { total: 2, mine: "maybe" }
    }).map((item) => item.id)
  ).toEqual(["open-unanswered", "open-mine"]);
});
