import { expect, test } from "vitest";
import { mapKnownErrorCodes, toUserMessage } from "./errors";

test("maps known error codes to user-facing messages", () => {
  expect(mapKnownErrorCodes("nickname_required")).toBe("Bitte gib einen Nickname ein.");
  expect(mapKnownErrorCodes("bad_backup")).toBe(
    "Die Datei konnte nicht gelesen werden oder ist keine valide Backup-Datei."
  );
});

test("keeps unknown error codes unchanged", () => {
  expect(mapKnownErrorCodes("custom_error")).toBe("custom_error");
});

test("normalizes thrown values to user messages", () => {
  expect(toUserMessage(new Error("register_failed"))).toBe(
    "Konto konnte nicht erstellt werden. Bitte erneut versuchen."
  );
  expect(toUserMessage("unknown_error")).toBe("unknown_error");
});
