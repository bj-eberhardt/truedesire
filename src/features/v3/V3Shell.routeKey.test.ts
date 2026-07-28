import { expect, test } from "vitest";
import type { V3Route, V3RouteMode } from "../../app/routes";
import { getV3RouteTransitionKey } from "./V3ShellRouteKey";

function route(mode: V3RouteMode, overrides: Partial<V3Route> = {}): V3Route {
  return { mode, pairId: null, ...overrides };
}

test("bootstrapping transition key wins over route-specific keys", () => {
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: true,
      route: route("adminStats")
    })
  ).toBe("account-bootstrap");
});

test("admin stats has a stable public route key", () => {
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: false,
      route: route("adminStats")
    })
  ).toBe("admin-stats");
});

test("pair route modes share a pair-scoped transition key", () => {
  for (const mode of ["pair", "pairMatches", "pairSettings"] satisfies V3RouteMode[]) {
    expect(
      getV3RouteTransitionKey({
        isBootstrappingGate: false,
        route: route(mode, { pairId: "pair-1" })
      })
    ).toBe("pair:pair-1");
  }
});

test("welcome and onboarding routes share the welcome key", () => {
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: false,
      route: route("welcome")
    })
  ).toBe("welcome");
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: false,
      route: route("home", { onboard: "backup" })
    })
  ).toBe("welcome");
});

test("home transition key differs by identity presence", () => {
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: false,
      route: route("home")
    })
  ).toBe("home");
  expect(
    getV3RouteTransitionKey({
      identityUserId: "user-1",
      isBootstrappingGate: false,
      route: route("home")
    })
  ).toBe("account-home");
});

test("fallback transition key includes mode and pair id", () => {
  expect(
    getV3RouteTransitionKey({
      isBootstrappingGate: false,
      route: route("ask", { pairId: "pair-1" })
    })
  ).toBe("ask:pair-1");
});
