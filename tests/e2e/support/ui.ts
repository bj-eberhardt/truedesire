import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export type TestUser = {
  context: BrowserContext;
  page: Page;
  nickname: string;
  code: string;
};

export function uniqueName(prefix: string): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}`.slice(0, 30);
}

function attr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function partnerCard(page: Page, partnerName: string) {
  return page.locator(`[data-testid="partner-card"][data-partner-name="${attr(partnerName)}"]`);
}

export async function clearBrowserState(context: BrowserContext): Promise<void> {
  await context.clearCookies();
  for (const page of context.pages()) {
    await page.goto("about:blank");
  }
}

export async function gotoApp(page: Page): Promise<void> {
  await page.goto("/#/v3");
  await expect(page.getByTestId("app-header")).toBeVisible();
}

export async function registerUser(page: Page, nickname: string): Promise<string> {
  await gotoApp(page);
  await expect(page.getByTestId("onboarding-view")).toBeVisible();
  await page.getByTestId("onboarding-new-account-button").click();
  await page.getByTestId("nickname-input").fill(nickname);
  await page.getByTestId("create-account-button").click();
  await expect(page.getByTestId("onboarding-finish-button")).toBeVisible();
  await page.getByTestId("onboarding-finish-button").click();
  await expect(page.getByTestId("home-view")).toBeVisible();
  return await readPairingCode(page);
}

export async function createRegisteredUser(browser: Browser, nickname: string): Promise<TestUser> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const code = await registerUser(page, nickname);
  return { context, page, nickname, code };
}

export async function readPairingCode(page: Page): Promise<string> {
  const code = page.getByTestId("profile-pairing-code");
  await expect(code).toBeVisible();
  await expect(code).not.toHaveText("-");
  return (await code.innerText()).trim();
}

export async function openProfileMenu(page: Page): Promise<void> {
  await page.getByTestId("profile-menu-button").click();
  await expect(page.getByTestId("profile-menu")).toHaveAttribute("data-open", "true");
}

export async function exportBackupText(page: Page): Promise<string> {
  await openProfileMenu(page);
  await page.getByTestId("profile-open-backup-button").click();
  await expect(page.getByTestId("backup-view")).toBeVisible();
  const textarea = page.getByTestId("backup-export-textarea");
  await expect(textarea).toBeEnabled();
  await expect.poll(async () => (await textarea.inputValue()).trim().length).toBeGreaterThan(0);
  return await textarea.inputValue();
}

export async function importBackupText(page: Page, backupText: string): Promise<string> {
  await gotoApp(page);
  await page.getByTestId("onboarding-has-backup-button").click();
  await page.getByTestId("backup-import-textarea").fill(backupText);
  await page.getByTestId("backup-import-submit-button").click();
  await expect(page.getByTestId("home-view")).toBeVisible();
  return await readPairingCode(page);
}

export async function sendPairRequest(page: Page, partnerCode: string): Promise<void> {
  await expect(page.getByTestId("pairing-panel")).toBeVisible();
  await page.getByTestId("partner-code-input").fill(partnerCode);
  await page.getByTestId("send-pair-request-button").click();
}

export async function refreshPairingRequests(page: Page): Promise<void> {
  await page.getByTestId("pairing-requests-refresh-button").click();
}

export async function pairUsers(alice: TestUser, bob: TestUser): Promise<string> {
  await sendPairRequest(alice.page, bob.code);
  await expect(
    alice.page.locator(`[data-testid="pairing-request-row"][data-request-code="${attr(bob.code)}"]`)
  ).toBeVisible();

  await refreshPairingRequests(bob.page);
  const incoming = bob.page.locator(
    `[data-testid="pairing-request-row"][data-request-code="${attr(alice.code)}"]`
  );
  await expect(incoming).toBeVisible();
  await incoming.getByTestId("pairing-request-accept-button").click();
  await expect(bob.page.getByTestId("pair-view")).toBeVisible();
  const pairId = (await bob.page.getByTestId("pair-view").getAttribute("data-pair-id")) ?? "";
  expect(pairId).not.toBe("");

  await alice.page.reload();
  await expect(alice.page.getByTestId("home-view")).toBeVisible();
  await expect(partnerCard(alice.page, bob.nickname)).toBeVisible();
  return pairId;
}

export async function openPair(page: Page, partnerName: string): Promise<string> {
  const card = partnerCard(page, partnerName);
  await expect(card).toBeVisible();
  const pairId = (await card.getAttribute("data-pair-id")) ?? "";
  await card.click();
  await expect(page.getByTestId("pair-view")).toBeVisible();
  if (pairId) await expect(page.getByTestId("pair-view")).toHaveAttribute("data-pair-id", pairId);
  return pairId;
}

export async function gotoPair(page: Page, pairId: string): Promise<void> {
  await page.goto(`/#/v3/pair/${encodeURIComponent(pairId)}`);
  await expect(page.getByTestId("pair-view")).toBeVisible();
  const refresh = page.getByTestId("pair-refresh-button");
  if ((await refresh.count()) > 0 && (await refresh.isVisible())) {
    await refresh.click();
    await page.waitForTimeout(1_700);
  }
}

export async function askQuestion(
  page: Page,
  text: string,
  answer: "yes" | "maybe" | "no" = "yes"
): Promise<void> {
  await page.getByTestId("ask-question-button").click();
  await expect(page.getByTestId("ask-view")).toBeVisible();
  await page.getByTestId("ask-question-input").fill(text);
  await page.getByTestId(`ask-answer-${answer}-button`).click();
  await page.getByTestId("ask-save-button").click();
  await expect(page.getByTestId("pair-view")).toBeVisible();
}

export async function answerCurrentQuestion(
  page: Page,
  answer: "yes" | "maybe" | "no"
): Promise<void> {
  await expect(page.getByTestId("play-card")).toBeVisible();
  await page.getByTestId(`answer-${answer}-button`).click();
  await expect(
    page.getByTestId("answer-saved-indicator").or(page.getByTestId("weekly-limit-notice"))
  ).toBeVisible();
}

export async function findQuestionByText(page: Page, questionText: string): Promise<void> {
  await expect(page.getByTestId("play-card")).toBeVisible();
  for (let i = 0; i < 50; i += 1) {
    const visibleText = await page.getByTestId("play-question-text").innerText();
    if (visibleText.includes(questionText)) return;
    const next = page.getByTestId("play-next-button");
    if ((await next.count()) === 0 || !(await next.isVisible())) break;
    await next.click();
  }
  throw new Error("Question not found in play cards: " + questionText);
}

export async function answerQuestionByText(
  page: Page,
  questionText: string,
  answer: "yes" | "maybe" | "no"
): Promise<void> {
  await findQuestionByText(page, questionText);
  await answerCurrentQuestion(page, answer);
}

export async function openMatches(page: Page): Promise<void> {
  await page.getByTestId("pair-tab-matches").click();
  await expect(page.getByTestId("pair-tab-matches")).toHaveAttribute("aria-selected", "true");
}

export async function openSettings(page: Page): Promise<void> {
  await page.getByTestId("pair-tab-settings").click();
  await expect(page.getByTestId("settings-panel")).toBeVisible();
}

export async function expectToastOrInlineError(page: Page, text: RegExp | string): Promise<void> {
  await expect(page.getByTestId("toast").or(page.getByTestId("inline-error"))).toContainText(text);
}
