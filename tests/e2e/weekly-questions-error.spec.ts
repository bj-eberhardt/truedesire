import { expect, test } from "@playwright/test";
import { createRegisteredUser, openPair, pairUsers, uniqueName } from "./support/ui";

test("shows an error instead of falling back to all questions when weekly questions fail to load", async ({
  browser
}) => {
  const alice = await createRegisteredUser(browser, uniqueName("WeekErrA"));
  const bob = await createRegisteredUser(browser, uniqueName("WeekErrB"));

  try {
    await pairUsers(alice, bob);

    await alice.page.route("**/api/system/questions/weekly/**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "weekly_questions_failed" })
      });
    });

    await openPair(alice.page, bob.nickname);

    await expect(alice.page.getByTestId("app-error-panel")).toBeVisible();
    await expect(alice.page.getByTestId("app-error-message")).toContainText(
      "Die Wochenfragen konnten nicht geladen werden"
    );
    await expect(alice.page.getByTestId("play-card")).toHaveCount(0);
  } finally {
    await alice.context.close();
    await bob.context.close();
  }
});
