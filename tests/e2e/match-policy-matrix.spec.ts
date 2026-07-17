import { expect, test, type Browser, type Page } from "@playwright/test";
import type { AnswerChoice, MatchPolicy, MatchResultView } from "../../src/types";
import {
  answerQuestionByText,
  askQuestion,
  createRegisteredUser,
  gotoPair,
  openMatches,
  openPair,
  openSettings,
  pairUsers,
  type TestUser,
  uniqueName
} from "./support/ui";

type ExpectedGrade = MatchResultView["grade"] | null;

const labels: Record<MatchPolicy, string> = {
  perfectOnly: "Nur perfekte Matches (Ja + Ja)",
  allowMixedMaybe: "Ja + Vielleicht zählt auch",
  allowMutualMaybe: "Alle Vielleicht-Matches zählen"
};

const combos: Array<{ alice: AnswerChoice; bob: AnswerChoice }> = [
  { alice: "yes", bob: "yes" },
  { alice: "yes", bob: "maybe" },
  { alice: "maybe", bob: "yes" },
  { alice: "maybe", bob: "maybe" },
  { alice: "yes", bob: "no" },
  { alice: "no", bob: "yes" },
  { alice: "maybe", bob: "no" },
  { alice: "no", bob: "maybe" },
  { alice: "no", bob: "no" }
];

function expectedGrade(policy: MatchPolicy, alice: AnswerChoice, bob: AnswerChoice): ExpectedGrade {
  if (alice === "no" || bob === "no") return null;
  if (alice === "yes" && bob === "yes") return "perfect";
  if (alice === "maybe" && bob === "maybe") {
    return policy === "allowMutualMaybe" ? "mutualMaybe" : null;
  }
  return policy === "perfectOnly" ? null : "maybe";
}

function matchByQuestion(page: Page, question: string) {
  return page
    .getByTestId("match-card")
    .filter({ has: page.getByTestId("match-question-text").filter({ hasText: question }) });
}

async function createPairedUsers(
  browser: Browser,
  prefix: string
): Promise<{ alice: TestUser; bob: TestUser; pairId: string }> {
  const alice = await createRegisteredUser(browser, uniqueName(`${prefix}A`));
  const bob = await createRegisteredUser(browser, uniqueName(`${prefix}B`));
  const pairId = await pairUsers(alice, bob);
  await openPair(alice.page, bob.nickname);
  return { alice, bob, pairId };
}

async function applyPolicy(
  alice: TestUser,
  bob: TestUser,
  pairId: string,
  policy: MatchPolicy
): Promise<void> {
  await gotoPair(alice.page, pairId);
  await openSettings(alice.page);
  await alice.page.getByTestId("settings-refresh-button").click();
  await expect(alice.page.getByTestId("match-policy-current")).toBeVisible();

  if (policy !== "allowMutualMaybe") {
    await alice.page.getByTestId("match-policy-select").selectOption(policy);
    await alice.page.getByTestId("match-policy-propose-button").click();
    await expect(alice.page.getByTestId("match-policy-pending-block")).toBeVisible();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await bob.page.getByTestId("match-policy-accept-button").click();
    await expect(bob.page.getByTestId("match-policy-current")).toContainText(labels[policy]);
  }

  await gotoPair(alice.page, pairId);
  await openSettings(alice.page);
  await alice.page.getByTestId("settings-refresh-button").click();
  await expect(alice.page.getByTestId("match-policy-current")).toContainText(labels[policy]);
  await alice.page.getByTestId("pair-tab-play").click();
  await expect(alice.page.getByTestId("pair-tab-play")).toHaveAttribute("aria-selected", "true");
}

for (const policy of ["perfectOnly", "allowMixedMaybe", "allowMutualMaybe"] as const) {
  test(`shows only the allowed match matrix under ${policy}`, async ({ browser }) => {
    test.slow();
    const { alice, bob, pairId } = await createPairedUsers(browser, `Matrix${policy}`);
    const questions = combos.map((combo, index) => ({
      ...combo,
      text: `${policy}-${index}-${combo.alice}-${combo.bob}-${uniqueName("Q")}`
    }));

    await applyPolicy(alice, bob, pairId, policy);

    await test.step("answer every answer combination", async () => {
      for (const item of questions) {
        await gotoPair(alice.page, pairId);
        await askQuestion(alice.page, item.text, item.alice);
        await gotoPair(bob.page, pairId);
        await answerQuestionByText(bob.page, item.text, item.bob);
      }
    });

    await test.step("assert visible matches and excluded non-matches", async () => {
      await openMatches(bob.page);
      for (const item of questions) {
        const grade = expectedGrade(policy, item.alice, item.bob);
        const match = matchByQuestion(bob.page, item.text);
        if (grade) {
          await expect(match).toHaveAttribute("data-match-grade", grade);
        } else {
          await expect(match).toHaveCount(0);
        }
      }
    });

    await alice.context.close();
    await bob.context.close();
  });
}
