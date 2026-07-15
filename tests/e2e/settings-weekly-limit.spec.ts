import { expect, test } from "@playwright/test";
import {
  createRegisteredUser,
  gotoPair,
  openPair,
  openSettings,
  pairUsers,
  uniqueName
} from "./support/ui";

test("manages weekly limit proposals and enforces then removes the accepted limit", async ({
  browser
}) => {
  test.slow();
  const alice = await createRegisteredUser(browser, uniqueName("LimitA"));
  const bob = await createRegisteredUser(browser, uniqueName("LimitB"));
  let pairId = "";

  await test.step("pair users and open settings", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await openSettings(alice.page);
  });

  await test.step("propose a limit and withdraw the own pending proposal", async () => {
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("15");
    await alice.page.getByTestId("weekly-limit-input").fill("1");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("15");
    await alice.page.getByTestId("weekly-limit-cancel-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("15");
  });

  await test.step("propose a second limit and reject it from the partner", async () => {
    await alice.page.getByTestId("weekly-limit-input").fill("1");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("15");

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("15");
    await bob.page.getByTestId("weekly-limit-reject-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("15");
  });

  await test.step("propose a one-question limit and accept it from the partner", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-input").fill("1");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("15");

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("15");
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("1");

    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("settings-refresh-button").click();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("1");
  });

  await test.step("show saved confirmation before the weekly limit notice", async () => {
    await gotoPair(bob.page, pairId);
    await expect(bob.page.getByTestId("play-card")).toBeVisible();
    await bob.page.getByTestId("answer-yes-button").click();
    await expect(bob.page.getByTestId("answer-saved-indicator")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-notice")).toHaveCount(0);
    await expect(bob.page.getByTestId("weekly-limit-notice")).toBeVisible({ timeout: 3_000 });
  });

  await test.step("switch to unlimited mode and make the remaining question playable again", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-toggle").click();
    await expect(alice.page.getByText("Alle Fragen erlaubt")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-propose-button")).toBeEnabled();
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(alice.page.getByTestId("weekly-limit-current")).toContainText("1");

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("1");
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(/Alle Fragen erlaubt/);

    await gotoPair(bob.page, pairId);
    await expect(bob.page.getByTestId("weekly-limit-notice")).toHaveCount(0);
    await expect(bob.page.getByTestId("play-card")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});
