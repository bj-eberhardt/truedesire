import { expect, test } from "@playwright/test";
import {
  answerCurrentQuestion,
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
  const alice = await createRegisteredUser(browser, uniqueName("LimitA"));
  const bob = await createRegisteredUser(browser, uniqueName("LimitB"));
  let pairId = "";

  await test.step("pair users and open settings", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await openSettings(alice.page);
  });

  await test.step("propose a limit and withdraw the own pending proposal", async () => {
    await alice.page.getByTestId("weekly-limit-input").fill("2");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await alice.page.getByTestId("weekly-limit-cancel-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
  });

  await test.step("propose a second limit and reject it from the partner", async () => {
    await alice.page.getByTestId("weekly-limit-input").fill("2");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeVisible();
    await bob.page.getByTestId("weekly-limit-reject-button").click();
    await expect(bob.page.getByTestId("weekly-limit-pending-block")).toBeHidden();
  });

  await test.step("propose a two-question limit and accept it from the partner", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-input").fill("2");
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText("2");
  });

  await test.step("consume the accepted weekly limit and show the limit notice", async () => {
    await gotoPair(bob.page, pairId);
    await answerCurrentQuestion(bob.page, "yes");
    await bob.page.waitForTimeout(800);
    if ((await bob.page.getByTestId("weekly-limit-notice").count()) === 0) {
      await answerCurrentQuestion(bob.page, "yes");
    }
    await expect(bob.page.getByTestId("weekly-limit-notice")).toBeVisible();
  });

  await test.step("switch to unlimited mode and make the remaining question playable again", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("weekly-limit-toggle").click();
    await alice.page.getByTestId("weekly-limit-propose-button").click();
    await expect(alice.page.getByTestId("weekly-limit-pending-block")).toBeVisible();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await bob.page.getByTestId("weekly-limit-accept-button").click();
    await expect(bob.page.getByTestId("weekly-limit-current")).toContainText(/Alle Fragen erlaubt/);

    await gotoPair(bob.page, pairId);
    await expect(bob.page.getByTestId("weekly-limit-notice")).toHaveCount(0);
    await expect(bob.page.getByTestId("play-card")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});
