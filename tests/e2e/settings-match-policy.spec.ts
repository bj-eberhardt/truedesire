import { expect, test } from "@playwright/test";
import {
  createRegisteredUser,
  gotoPair,
  openPair,
  openSettings,
  pairUsers,
  uniqueName
} from "./support/ui";

const labels = {
  perfectOnly: "Nur perfekte Matches (Ja + Ja)",
  allowMixedMaybe: "Ja + Vielleicht zählt auch",
  allowMutualMaybe: "Alle Vielleicht-Matches zählen"
} as const;

test("manages match policy proposals with withdraw, reject, and accept", async ({ browser }) => {
  test.slow();
  const alice = await createRegisteredUser(browser, uniqueName("PolicyA"));
  const bob = await createRegisteredUser(browser, uniqueName("PolicyB"));
  let pairId = "";

  await test.step("pair users and open settings", async () => {
    pairId = await pairUsers(alice, bob);
    await openPair(alice.page, bob.nickname);
    await openSettings(alice.page);
  });

  await test.step("renders options from strict to loose", async () => {
    const options = alice.page.getByTestId("match-policy-select").locator("option");
    await expect(options).toHaveText([
      labels.perfectOnly,
      labels.allowMixedMaybe,
      labels.allowMutualMaybe
    ]);
  });

  await test.step("propose perfect-only and withdraw the own pending proposal", async () => {
    await expect(alice.page.getByTestId("match-policy-current")).toContainText(
      labels.allowMutualMaybe
    );
    await alice.page.getByTestId("match-policy-select").selectOption("perfectOnly");
    await expect(alice.page.getByTestId("match-policy-propose-button")).toBeEnabled();
    await alice.page.getByTestId("match-policy-propose-button").click();
    await expect(alice.page.getByTestId("match-policy-pending-block")).toBeVisible();
    await alice.page.getByTestId("match-policy-cancel-button").click();
    await expect(alice.page.getByTestId("match-policy-pending-block")).toBeHidden();
    await expect(alice.page.getByTestId("match-policy-current")).toContainText(
      labels.allowMutualMaybe
    );
  });

  await test.step("propose perfect-only again and reject it from the partner", async () => {
    await alice.page.getByTestId("match-policy-select").selectOption("perfectOnly");
    await alice.page.getByTestId("match-policy-propose-button").click();
    await expect(alice.page.getByTestId("match-policy-pending-block")).toBeVisible();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await expect(bob.page.getByTestId("match-policy-pending-block")).toBeVisible();
    await bob.page.getByTestId("match-policy-reject-button").click();
    await expect(bob.page.getByTestId("match-policy-pending-block")).toBeHidden();
    await expect(bob.page.getByTestId("match-policy-current")).toContainText(
      labels.allowMutualMaybe
    );
  });

  await test.step("propose perfect-only again and accept it from the partner", async () => {
    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("match-policy-select").selectOption("perfectOnly");
    await alice.page.getByTestId("match-policy-propose-button").click();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await bob.page.getByTestId("match-policy-accept-button").click();
    await expect(bob.page.getByTestId("match-policy-current")).toContainText(labels.perfectOnly);

    await gotoPair(alice.page, pairId);
    await openSettings(alice.page);
    await alice.page.getByTestId("settings-refresh-button").click();
    await expect(alice.page.getByTestId("match-policy-current")).toContainText(labels.perfectOnly);
  });

  await test.step("switch to mutual maybe through the same proposal flow", async () => {
    await alice.page.getByTestId("match-policy-select").selectOption("allowMutualMaybe");
    await alice.page.getByTestId("match-policy-propose-button").click();

    await gotoPair(bob.page, pairId);
    await openSettings(bob.page);
    await bob.page.getByTestId("settings-refresh-button").click();
    await bob.page.getByTestId("match-policy-accept-button").click();
    await expect(bob.page.getByTestId("match-policy-current")).toContainText(
      labels.allowMutualMaybe
    );
  });

  await alice.context.close();
  await bob.context.close();
});
