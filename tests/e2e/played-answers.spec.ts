import { expect, test } from "@playwright/test";
import {
  answerQuestionByText,
  askQuestion,
  createRegisteredUser,
  gotoPair,
  openMatches,
  openPair,
  pairUsers,
  uniqueName
} from "./support/ui";

test("allows changing own pending answer and removes it from editable answers after partner answered", async ({
  browser
}) => {
  const alice = await createRegisteredUser(browser, uniqueName("PlayedA"));
  const bob = await createRegisteredUser(browser, uniqueName("PlayedB"));
  let pairId = "";
  const question = `Editable ${uniqueName("Q")}`;

  await test.step("pair users and create a pending self-answered question", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await askQuestion(alice.page, question, "yes");
    await expect(alice.page.getByTestId("played-answers-button")).toBeVisible();
  });

  await test.step("open played answers and change the own answer", async () => {
    await alice.page.getByTestId("played-answers-button").click();
    await expect(alice.page.getByTestId("played-view")).toBeVisible();
    await expect(alice.page.getByTestId("played-question-text")).toContainText(question);
    await alice.page.getByTestId("played-answer-maybe-button").click();
    await expect(alice.page.getByTestId("played-saved-indicator")).toBeVisible();
  });

  await test.step("answer as partner and compute the match", async () => {
    await gotoPair(bob.page, pairId);
    await answerQuestionByText(bob.page, question, "maybe");
    await openMatches(bob.page);
    const match = bob.page
      .getByTestId("match-card")
      .filter({ has: bob.page.getByTestId("match-question-text").filter({ hasText: question }) });
    await expect(match).toHaveAttribute("data-match-grade", "mutualMaybe");
  });

  await test.step("reopen played answers and verify the answered question is no longer editable", async () => {
    await alice.page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}/played`);
    await alice.page.reload();
    await expect(alice.page.getByTestId("played-view")).toBeVisible();
    await expect(alice.page.getByTestId("played-empty-state")).toBeVisible();
    await expect(alice.page.getByTestId("played-list")).toHaveCount(0);
  });

  await alice.context.close();
  await bob.context.close();
});
