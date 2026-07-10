import { expect, test } from "@playwright/test";
import {
  askQuestion,
  createRegisteredUser,
  gotoPair,
  openPair,
  openSettings,
  pairUsers,
  uniqueName
} from "./support/ui";

test("navigates through header, deep links, tabs, and refresh controls with persisted account state", async ({
  browser
}) => {
  const alice = await createRegisteredUser(browser, uniqueName("NavA"));
  const bob = await createRegisteredUser(browser, uniqueName("NavB"));
  let pairId = "";
  const question = `Navigation ${uniqueName("Q")}`;

  await test.step("pair users and create state for pair subroutes", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await askQuestion(alice.page, question, "yes");
  });

  await test.step("brand button returns from pair view to home", async () => {
    await gotoPair(alice.page, pairId);
    await alice.page.getByTestId("header-brand").click();
    await expect(alice.page.getByTestId("home-view")).toBeVisible();
  });

  await test.step("deep link to pair play view and refresh it", async () => {
    await gotoPair(alice.page, pairId);
    await alice.page.getByTestId("pair-refresh-button").click();
    await expect(alice.page.getByTestId("pair-view")).toHaveAttribute("data-pair-id", pairId);
  });

  await test.step("deep link to ask view and return with the back button", async () => {
    await alice.page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}/ask`);
    await expect(alice.page.getByTestId("ask-view")).toBeVisible();
    await alice.page.getByTestId("ask-back-button").click();
    await expect(alice.page.getByTestId("pair-view")).toBeVisible();
  });

  await test.step("deep link to played answers", async () => {
    await alice.page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}/played`);
    await expect(alice.page.getByTestId("played-view")).toBeVisible();
  });

  await test.step("deep link to matches and use refresh control", async () => {
    await alice.page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}/matches`);
    await expect(alice.page.getByTestId("pair-tab-matches")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await alice.page.getByTestId("matches-refresh-button").click();
    await expect(alice.page.getByTestId("pair-view")).toBeVisible();
  });

  await test.step("deep link to settings and use refresh control", async () => {
    await alice.page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}/settings`);
    await openSettings(alice.page);
    await alice.page.getByTestId("settings-refresh-button").click();
    await expect(alice.page.getByTestId("settings-panel")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});
