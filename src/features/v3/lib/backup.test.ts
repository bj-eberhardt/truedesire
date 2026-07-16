import { expect, test } from "vitest";
import { formatJsonMaybe, safeBackupFilename } from "./backup";

test("formats valid JSON text", () => {
  expect(formatJsonMaybe('{"code":"ABC","items":[1,2]}')).toBe(
    JSON.stringify({ code: "ABC", items: [1, 2] }, null, 2)
  );
});

test("returns invalid JSON text unchanged", () => {
  expect(formatJsonMaybe("{not-json")).toBe("{not-json");
});

test("creates safe backup filenames", () => {
  expect(safeBackupFilename(" AB-C_12 ")).toBe("AB-C_12.json");
  expect(safeBackupFilename("A/B:C*D?")).toBe("ABCD.json");
  expect(safeBackupFilename("   ")).toBe("backup.json");
  expect(safeBackupFilename(null)).toBe("backup.json");
});
