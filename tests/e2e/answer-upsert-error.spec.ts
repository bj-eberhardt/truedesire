import { expect, test } from "@playwright/test";
import {
  askQuestion,
  createRegisteredUser,
  findQuestionByText,
  gotoPair,
  openPair,
  pairUsers,
  uniqueName
} from "./support/ui";

test("shows an inline card error when answering a question fails", async ({ browser }) => {
  const alice = await createRegisteredUser(browser, uniqueName("AnswerErrA"));
  const bob = await createRegisteredUser(browser, uniqueName("AnswerErrB"));
  const question = `Answer error ${uniqueName("Q")}`;

  try {
    const pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await askQuestion(alice.page, question, "yes");

    await gotoPair(bob.page, pairId);
    await findQuestionByText(bob.page, question);
    await bob.page.route(/\/(?:api\/)?answers\/upsert$/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_error" })
      });
    });

    await bob.page.getByTestId("answer-yes-button").click();

    await expect(bob.page.getByTestId("play-card")).toContainText(question);
    await expect(bob.page.getByTestId("answer-error-message")).toContainText(
      "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut."
    );
    await expect(bob.page.getByTestId("answer-yes-button")).toBeEnabled();
  } finally {
    await alice.context.close();
    await bob.context.close();
  }
});
