import { expect, test } from "vitest";
import { parseAppRoute } from "./routes";

test("parses root v3 routes as home", () => {
  expect(parseAppRoute("")).toEqual({ kind: "v3", route: { mode: "home", pairId: null } });
  expect(parseAppRoute("#/v3")).toEqual({ kind: "v3", route: { mode: "home", pairId: null } });
});

test("parses v3 pair subroutes with decoded pair ids", () => {
  const pairId = "pair/id with space";
  const encodedPairId = encodeURIComponent(pairId);

  expect(parseAppRoute(`#/v3/pair/${encodedPairId}`)).toEqual({
    kind: "v3",
    route: { mode: "pair", pairId }
  });
  expect(parseAppRoute(`#/v3/pair/${encodedPairId}/matches`)).toEqual({
    kind: "v3",
    route: { mode: "pairMatches", pairId }
  });
  expect(parseAppRoute(`#/v3/pair/${encodedPairId}/settings`)).toEqual({
    kind: "v3",
    route: { mode: "pairSettings", pairId }
  });
  expect(parseAppRoute(`#/v3/pair/${encodedPairId}/ask`)).toEqual({
    kind: "v3",
    route: { mode: "ask", pairId }
  });
  expect(parseAppRoute(`#/v3/pair/${encodedPairId}/played`)).toEqual({
    kind: "v3",
    route: { mode: "played", pairId }
  });
});

test("maps backup, welcome, import and onboarding routes", () => {
  expect(parseAppRoute("#/v3/backup")).toEqual({
    kind: "v3",
    route: { mode: "backup", pairId: null }
  });
  expect(parseAppRoute("#/v3/account-deleted")).toEqual({
    kind: "v3",
    route: { mode: "accountDeleted", pairId: null }
  });
  expect(parseAppRoute("#/v3/welcome")).toEqual({
    kind: "v3",
    route: { mode: "welcome", pairId: null }
  });
  expect(parseAppRoute("#/v3/import")).toEqual({
    kind: "v3",
    route: { mode: "home", pairId: null, onboard: "backup" }
  });
  expect(parseAppRoute("#/v3/onboarding")).toEqual({
    kind: "v3",
    route: { mode: "home", pairId: null, onboard: "start" }
  });
  expect(parseAppRoute("#/v3/onboarding/backup-save")).toEqual({
    kind: "v3",
    route: { mode: "home", pairId: null, onboard: "backup-save" }
  });
  expect(parseAppRoute("#/v3/onboarding/pairing")).toEqual({
    kind: "v3",
    route: { mode: "home", pairId: null, onboard: "pairing" }
  });
});

test("keeps legacy v1/v2 and bare pair links compatible with v3 routing", () => {
  expect(parseAppRoute("#/v1/pair/legacy")).toEqual({
    kind: "v3",
    route: { mode: "pair", pairId: "legacy" }
  });
  expect(parseAppRoute("#/v2/pair/legacy/matches")).toEqual({
    kind: "v3",
    route: { mode: "pairMatches", pairId: "legacy" }
  });
  expect(parseAppRoute("#/pair/bare")).toEqual({
    kind: "v3",
    route: { mode: "pair", pairId: "bare" }
  });
});

test("falls back to home for unknown routes", () => {
  expect(parseAppRoute("#/v3/unknown")).toEqual({
    kind: "v3",
    route: { mode: "home", pairId: null }
  });
});
