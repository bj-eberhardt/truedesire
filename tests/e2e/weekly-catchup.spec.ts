import { expect, test } from "@playwright/test";
import {
  answerQuestionByText,
  askQuestion,
  createRegisteredUser,
  openPair,
  pairUsers,
  uniqueName
} from "./support/ui";

async function mockEmptyWeeklyPlan(page: Parameters<typeof openPair>[0]) {
  await page.route(/\/(?:api\/)?system\/questions\/weekly\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        weekStart: 1000,
        catalogVersion: 1,
        questions: [],
        ownQuestionIds: [],
        verificationCatalog: []
      })
    });
  });
  await page.route(/\/(?:api\/)?pairs\/seed-weekly-system-questions$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, alreadySeeded: true })
    });
  });
}

test("shows and resolves a half-answered catch-up question outside the weekly plan", async ({
  browser
}) => {
  const alice = await createRegisteredUser(browser, uniqueName("CatchupA"));
  const bob = await createRegisteredUser(browser, uniqueName("CatchupB"));
  const question = `Catchup ${uniqueName("Q")}`;

  try {
    await mockEmptyWeeklyPlan(bob.page);
    await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await askQuestion(alice.page, question, "yes");

    await bob.page.getByTestId("pair-back-button").click();
    await expect(bob.page.getByTestId("home-view")).toBeVisible();
    await openPair(bob.page, alice.nickname);
    await bob.page.getByTestId("pair-refresh-button").click();

    await expect(bob.page.getByTestId("play-question-text")).toContainText(question);
    await answerQuestionByText(bob.page, question, "yes");

    await bob.page.reload();
    await expect(bob.page.getByTestId("pair-view")).toBeVisible();
    await expect(bob.page.getByTestId("play-card")).toHaveCount(0);
  } finally {
    await alice.context.close();
    await bob.context.close();
  }
});
