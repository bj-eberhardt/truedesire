import type { V3Route, V3RouteMode } from "../../app/routes";

export function isPairRouteMode(mode: V3RouteMode): boolean {
  return mode === "pair" || mode === "pairMatches" || mode === "pairSettings";
}

export function getV3RouteTransitionKey(opts: {
  identityUserId?: string | null;
  isBootstrappingGate: boolean;
  route: V3Route;
}) {
  const { identityUserId, isBootstrappingGate, route } = opts;
  const routeOnboard = route.onboard ?? "start";

  if (isBootstrappingGate) return "account-bootstrap";
  if (route.mode === "adminStats") return "admin-stats";
  if (isPairRouteMode(route.mode)) return `pair:${route.pairId ?? ""}`;
  if (route.mode === "welcome" || routeOnboard !== "start") return "welcome";

  if (route.mode === "home") {
    return identityUserId ? "account-home" : "home";
  }

  return `${route.mode}:${route.pairId ?? ""}`;
}
