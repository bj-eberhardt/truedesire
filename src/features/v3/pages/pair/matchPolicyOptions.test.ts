import { expect, test } from "vitest";
import { MATCH_POLICY_OPTIONS } from "./matchPolicyOptions";

test("orders match policy options from strict to loose", () => {
  expect(MATCH_POLICY_OPTIONS.map((option) => option.value)).toEqual([
    "perfectOnly",
    "allowMixedMaybe",
    "allowMutualMaybe"
  ]);
});
