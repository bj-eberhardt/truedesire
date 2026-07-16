import { expect, test } from "vitest";
import { pairingInlineErrorFor } from "./pairingErrors";

test("maps known pairing errors to inline messages", () => {
  expect(pairingInlineErrorFor("unknown_partner_code")).toContain("Partner-Code");
  expect(pairingInlineErrorFor("already_linked")).toContain("bereits");
  expect(pairingInlineErrorFor("rate_limited")).toContain("Versuche");
});

test("returns null for unknown pairing errors", () => {
  expect(pairingInlineErrorFor("something_else")).toBeNull();
});
