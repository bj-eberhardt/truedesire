import { expect, test } from "@playwright/test";
import {
  createRegisteredUser,
  exportBackupText,
  gotoApp,
  gotoWelcome,
  importBackupText,
  openProfileMenu,
  readPairingCode,
  uniqueName
} from "./support/ui";

test("validates registration, creates an account, and downloads the optional onboarding backup", async ({
  page
}) => {
  const nickname = uniqueName("Onboard");

  await test.step("open onboarding and verify empty nickname cannot be submitted", async () => {
    await gotoApp(page);
    await expect(page.getByTestId("welcome-teaser")).toBeVisible();
    await expect(page.getByTestId("onboarding-view")).toHaveCount(0);
    await page.getByTestId("welcome-start-button").click();
    await expect(page).toHaveURL(/#\/v3\/welcome$/);
    await expect(page.getByTestId("onboarding-view")).toBeVisible();
    await page.getByTestId("onboarding-new-account-button").click();
    await page.getByTestId("nickname-input").fill("");
    await expect(page.getByTestId("create-account-button")).toBeDisabled();
  });

  await test.step("register a new account", async () => {
    await page.getByTestId("nickname-input").fill(nickname);
    await page.getByTestId("create-account-button").click();
    await expect(page.getByTestId("onboarding-download-backup-button")).toBeVisible();
  });

  await test.step("download the optional backup from onboarding", async () => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("onboarding-download-backup-button").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^[A-Z0-9-]+\.json$/);
  });

  await test.step("finish onboarding and show the home screen", async () => {
    await page.getByTestId("onboarding-backup-next-button").click();
    await expect(page.getByTestId("onboarding-next-step-card")).toBeVisible();
    await page.getByTestId("onboarding-finish-button").click();
    await expect(page.getByTestId("home-view")).toBeVisible();
    await expect(page.getByTestId("profile-pairing-code")).toBeVisible();
  });
});

test("exports a backup, rejects invalid import text, imports a valid backup, and deletes account with confirmation", async ({
  browser,
  page
}) => {
  const nickname = uniqueName("Backup");
  let originalCode = "";
  let backupText = "";

  await test.step("register source account and export backup text", async () => {
    await gotoWelcome(page);
    await page.getByTestId("onboarding-new-account-button").click();
    await page.getByTestId("nickname-input").fill(nickname);
    await page.getByTestId("create-account-button").click();
    await page.getByTestId("onboarding-backup-next-button").click();
    await page.getByTestId("onboarding-finish-button").click();
    originalCode = await readPairingCode(page);
    backupText = await exportBackupText(page);
    expect(JSON.parse(backupText).nickname).toBe(nickname);
  });

  await test.step("show an inline error for invalid backup JSON", async () => {
    const invalidContext = await browser.newContext();
    const invalidPage = await invalidContext.newPage();
    await gotoWelcome(invalidPage);
    await invalidPage.getByTestId("onboarding-has-backup-button").click();
    await invalidPage.getByTestId("backup-import-textarea").fill("{bad json");
    await invalidPage.getByTestId("backup-import-submit-button").click();
    await expect(invalidPage.getByTestId("onboarding-error")).toBeVisible();
    await invalidContext.close();
  });

  await test.step("import the valid backup in a fresh browser context", async () => {
    const importContext = await browser.newContext();
    const importPage = await importContext.newPage();
    const importedCode = await importBackupText(importPage, backupText);
    expect(importedCode).toBe(originalCode);
    await importContext.close();
  });

  await test.step("cancel account deletion and keep the account", async () => {
    await page.goto("/#/v3");
    await openProfileMenu(page);
    await page.getByTestId("profile-delete-account-button").click();
    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await page.getByTestId("confirm-cancel-button").click();
    await expect(page.getByTestId("profile-pairing-code")).toHaveText(originalCode);
  });

  await test.step("delete only on this device and show delete success route", async () => {
    await openProfileMenu(page);
    await page.getByTestId("profile-delete-account-button").click();
    await expect(page.getByTestId("delete-local-option")).toHaveAttribute("data-active", "true");
    await page.getByTestId("confirm-confirm-button").click();
    await expect(page.getByTestId("account-deleted-view")).toBeVisible();
    await expect(page).toHaveURL(/#\/v3\/account-deleted$/);
    await expect(page.getByText("Schade")).toBeVisible();
    await expect(page.getByTestId("delete-success-new-account-button")).toBeVisible();
    await expect(page.getByTestId("delete-success-import-backup-button")).toBeVisible();
  });

  await test.step("restore backup for final server-side account deletion", async () => {
    await page.getByTestId("delete-success-import-backup-button").click();
    await expect(page.getByTestId("onboarding-view")).toBeVisible();
    await page.getByTestId("backup-import-textarea").fill(backupText);
    await page.getByTestId("backup-import-submit-button").click();
    await expect(page.getByTestId("account-loading-bar")).toBeVisible();
    await expect(page.getByTestId("home-view")).toBeVisible();
    await expect(page.getByTestId("profile-pairing-code")).toHaveText(originalCode);
  });

  await test.step("confirm account deletion and show delete success route", async () => {
    await openProfileMenu(page);
    await page.getByTestId("profile-delete-account-button").click();
    await page.getByTestId("delete-server-option").click();
    await expect(page.getByTestId("delete-server-option")).toHaveAttribute("data-active", "true");
    await page.getByTestId("confirm-confirm-button").click();
    await expect(page.getByTestId("account-deleted-view")).toBeVisible();
    await expect(page).toHaveURL(/#\/v3\/account-deleted$/);
    await expect(page.getByText("Schade")).toBeVisible();
    await expect(page.getByTestId("delete-success-new-account-button")).toBeVisible();
    await expect(page.getByTestId("delete-success-import-backup-button")).toBeVisible();
  });
});

test("sends a pairing request from onboarding and opens home at pending requests", async ({
  browser,
  page
}) => {
  const bob = await createRegisteredUser(browser, uniqueName("OnboardBob"));
  const aliceNickname = uniqueName("OnboardPair");

  await gotoWelcome(page);
  await page.getByTestId("onboarding-new-account-button").click();
  await page.getByTestId("nickname-input").fill(aliceNickname);
  await page.getByTestId("create-account-button").click();
  await page.getByTestId("onboarding-backup-next-button").click();
  await expect(page.getByTestId("onboarding-next-step-card")).toBeVisible();

  await page.getByTestId("onboarding-partner-code-input").fill(bob.code);
  await page.getByTestId("onboarding-send-pair-request-button").click();
  await expect(page.getByTestId("onboarding-pair-request-sent")).toBeVisible();

  await page.getByTestId("onboarding-finish-button").click();
  await expect(page.getByTestId("home-view")).toBeVisible();
  await expect(page.getByTestId("pairing-requests-panel")).toBeInViewport();
  await expect(
    page.locator(`[data-testid="pairing-request-row"][data-request-code="${bob.code}"]`)
  ).toBeVisible();

  await bob.context.close();
});
