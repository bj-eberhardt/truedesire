import { expect, test, type Browser } from "@playwright/test";
import {
  answerQuestionByText,
  askQuestion,
  createRegisteredUser,
  gotoPair,
  openMatches,
  openPair,
  pairUsers,
  type TestUser,
  uniqueName
} from "./support/ui";

async function createPairedUsers(
  browser: Browser,
  prefix: string
): Promise<{
  alice: TestUser;
  bob: TestUser;
  pairId: string;
}> {
  const alice = await createRegisteredUser(browser, uniqueName(`${prefix}A`));
  const bob = await createRegisteredUser(browser, uniqueName(`${prefix}B`));
  const pairId = await pairUsers(alice, bob);
  await openPair(alice.page, bob.nickname);
  return { alice, bob, pairId };
}

function matchByQuestion(page: TestUser["page"], question: string) {
  return page
    .getByTestId("match-card")
    .filter({ has: page.getByTestId("match-question-text").filter({ hasText: question }) });
}

test("creates a yes/yes custom question, shows a perfect match, hides it, and restores it", async ({
  browser
}) => {
  const { alice, bob, pairId } = await createPairedUsers(browser, "Perfect");
  const question = `Perfect ${uniqueName("Q")}`;

  await test.step("ask and answer the custom question", async () => {
    await askQuestion(alice.page, question, "yes");
    await gotoPair(bob.page, pairId);
    await answerQuestionByText(bob.page, question, "yes");
  });

  await test.step("compute, hide, show hidden, and restore the perfect match", async () => {
    await openMatches(bob.page);
    const match = matchByQuestion(bob.page, question);
    await expect(match).toHaveAttribute("data-match-grade", "perfect");
    await match.getByTestId("match-visibility-button").click();
    await expect(match).toBeHidden();

    await bob.page.getByTestId("toggle-hidden-matches-button").click();
    const hiddenMatch = matchByQuestion(bob.page, question);
    await expect(hiddenMatch).toBeVisible();
    await hiddenMatch.getByTestId("match-visibility-button").click();
    await expect(hiddenMatch).toBeHidden();
    await expect(matchByQuestion(bob.page, question)).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});

test("creates a yes/maybe custom question and shows a maybe match", async ({ browser }) => {
  const { alice, bob, pairId } = await createPairedUsers(browser, "Maybe");
  const question = `Maybe ${uniqueName("Q")}`;

  await test.step("ask and answer with maybe", async () => {
    await askQuestion(alice.page, question, "yes");
    await gotoPair(bob.page, pairId);
    await answerQuestionByText(bob.page, question, "maybe");
  });

  await test.step("compute and assert maybe grade", async () => {
    await openMatches(bob.page);
    await expect(matchByQuestion(bob.page, question)).toHaveAttribute("data-match-grade", "maybe");
  });

  await alice.context.close();
  await bob.context.close();
});

test("excludes a custom question when either answer is no", async ({ browser }) => {
  const { alice, bob, pairId } = await createPairedUsers(browser, "NoMatch");
  const question = `NoMatch ${uniqueName("Q")}`;

  await test.step("ask and answer with no", async () => {
    await askQuestion(alice.page, question, "yes");
    await gotoPair(bob.page, pairId);
    await answerQuestionByText(bob.page, question, "no");
  });

  await test.step("compute matches and assert the question is excluded", async () => {
    await openMatches(bob.page);
    await expect(bob.page.getByTestId("no-matches-state")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});
