import { expect, test } from "@playwright/test";
import {
  createRegisteredUser,
  partnerCard,
  refreshPairingRequests,
  sendPairRequest,
  uniqueName
} from "./support/ui";

test("covers unknown code, reject, cancel, accept, and duplicate pairing flows", async ({
  browser
}) => {
  const alice = await createRegisteredUser(browser, uniqueName("PairAlice"));
  const bob = await createRegisteredUser(browser, uniqueName("PairBob"));

  await test.step("show inline error for unknown partner code", async () => {
    await sendPairRequest(alice.page, "UNKNOWN1");
    await expect(alice.page.getByTestId("pairing-inline-error")).toBeVisible();
  });

  await test.step("send a request and reject it from the receiver", async () => {
    await sendPairRequest(alice.page, bob.code);
    await expect(
      alice.page.locator(`[data-testid="pairing-request-row"][data-request-code="${bob.code}"]`)
    ).toBeVisible();

    await refreshPairingRequests(bob.page);
    const incoming = bob.page.locator(
      `[data-testid="pairing-request-row"][data-request-code="${alice.code}"]`
    );
    await expect(incoming).toBeVisible();
    await incoming.getByTestId("pairing-request-reject-button").click();
    await expect(incoming).toBeHidden();
  });

  await test.step("send another request and cancel it from the sender", async () => {
    await sendPairRequest(alice.page, bob.code);
    const outgoing = alice.page.locator(
      `[data-testid="pairing-request-row"][data-request-code="${bob.code}"]`
    );
    await expect(outgoing).toBeVisible();
    await outgoing.getByTestId("pairing-request-cancel-button").click();
    await alice.page.reload();
    await expect(alice.page.getByTestId("home-view")).toBeVisible();
    await expect(outgoing).toBeHidden();
  });

  await test.step("accept a request and show partner cards for both users", async () => {
    await sendPairRequest(alice.page, bob.code);
    await refreshPairingRequests(bob.page);
    const incoming = bob.page.locator(
      `[data-testid="pairing-request-row"][data-request-code="${alice.code}"]`
    );
    await incoming.getByTestId("pairing-request-accept-button").click();
    await expect(bob.page.getByTestId("pair-view")).toBeVisible();

    await bob.page.getByTestId("pair-back-button").click();
    await expect(partnerCard(bob.page, alice.nickname)).toBeVisible();

    await alice.page.reload();
    await expect(alice.page.getByTestId("home-view")).toBeVisible();
    await expect(partnerCard(alice.page, bob.nickname)).toBeVisible();
  });

  await test.step("show duplicate-link error when trying to pair again", async () => {
    await sendPairRequest(alice.page, bob.code);
    await expect(alice.page.getByTestId("pairing-inline-error")).toBeVisible();
  });

  await alice.context.close();
  await bob.context.close();
});
