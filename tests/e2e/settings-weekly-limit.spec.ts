import { expect, test, type Page } from "@playwright/test";
import {
  createRegisteredUser,
  gotoPair,
  openPair,
  openSettings,
  pairUsers,
  uniqueName
} from "./support/ui";

test("manages weekly limit proposals and removes the accepted limit", async ({ browser }) => {
  test.slow();
  const alice = await createRegisteredUser(browser, uniqueName("LimitA"));
  const bob = await createRegisteredUser(browser, uniqueName("LimitB"));
  let pairId = "";
  let initialWeeklyLimit = "";

  await test.step("pair users and open settings", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await openSettings(alice.page);
  });

  await test.step("propose a limit and withdraw the own pending proposal", async () => {
    initialWeeklyLimit = await weeklyLimitCurrentValue(alice.page);
    await alice.page.getByTestId("weekly-limit-input").fill("6");
    await expect(alice.page.locator('[data-id="weekly-limit-change-warning"]')).toBeVisible();
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);
    await alice.page.getByTestId("weekly-limit-cancel-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);
  });

  await test.step("propose a second limit and reject it from the partner", async () => {
    await alice.page.getByTestId("weekly-limit-input").fill("6");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);
    await bob.page.getByTestId("weekly-limit-reject-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);
  });

  await test.step("propose the minimum weekly limit and accept it from the partner", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-input").fill("6");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(initialWeeklyLimit);
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("6");

    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("settings-refresh-button").click();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("6");
  });

  await test.step("warns when increasing the weekly limit draft", async () => {
    await alice.page.getByTestId("weekly-limit-input").fill("7");
    await expect(alice.page.locator('[data-id="weekly-limit-change-warning"]')).toBeVisible();
    await alice.page.getByTestId("weekly-limit-input").fill("6");
    await expect(alice.page.locator('[data-id="weekly-limit-change-warning"]')).toBeHidden();
  });

  await test.step("show the accepted minimum in the play view", async () => {
    await gotoPair(bob.page, pairId);
    await expect(bob.page.getByTestId("play-card")).toBeVisible();
    await expect(bob.page.getByText(/6\s*neue Antworten/)).toBeVisible();
  });

  await test.step("switch to unlimited mode and make the remaining question playable again", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-toggle").click();
    await expect(alice.page.getByText("Alle Fragen erlaubt")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-propose-button")).toBeEnabled();
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("6");

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("6");
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(/Alle Fragen erlaubt/);

    await gotoPair(bob.page, pairId);
    await expect(bob.page.getByTestId("weekly-limit-notice")).toHaveCount(0);
    await expect(bob.page.getByTestId("play-card")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});

async function weeklyLimitCurrentValue(page: Page): Promise<string> {
  const text = await page.getByTestId("weekly-limit-current").innerText();
  const match = text.match(/\d+/);
  expect(match?.[0]).toBeTruthy();
  return match?.[0] ?? "";
}
