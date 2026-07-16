import { expect, test } from "vitest";
import { activeOnboardingStepId, onboardingSteps } from "./onboardingSteps";

test("builds the compact onboarding steps for start and backup import", () => {
  expect(onboardingSteps("start").map((step) => step.id)).toEqual(["choose", "setup", "ready"]);
  expect(onboardingSteps("backup").map((step) => step.title)).toEqual([
    "Start",
    "Backup importieren",
    "Fertig"
  ]);
});

test("builds the expanded onboarding steps for new accounts", () => {
  expect(onboardingSteps("new").map((step) => step.id)).toEqual([
    "choose",
    "new",
    "backup",
    "ready"
  ]);
  expect(onboardingSteps("backup-save").map((step) => step.id)).toEqual([
    "choose",
    "new",
    "backup",
    "ready"
  ]);
});

test("derives the active onboarding step from the route segment", () => {
  expect(activeOnboardingStepId("start")).toBe("choose");
  expect(activeOnboardingStepId("backup")).toBe("setup");
  expect(activeOnboardingStepId("new")).toBe("new");
  expect(activeOnboardingStepId("backup-save")).toBe("backup");
});
