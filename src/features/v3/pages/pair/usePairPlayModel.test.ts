import { expect, test } from "vitest";
import { nextWeeklyResetDateText } from "./usePairPlayModel";

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

test("returns the next Monday for a Monday date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 13))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});

test("returns the next Monday for a Sunday date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 19))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});

test("returns the upcoming Monday for a mid-week date", () => {
  expect(nextWeeklyResetDateText(localDate(2026, 7, 15))).toBe(
    localDate(2026, 7, 20).toLocaleDateString()
  );
});
