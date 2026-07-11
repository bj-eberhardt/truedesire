import { useEffect, useState } from "react";
import { parseAppRoute, type AppRoute, type V3Route } from "../routes";

type UseAppRouteResult = {
  route: AppRoute;
  pairRouteMode: V3Route["mode"] | null;
  pairRoutePairId: string | null;
};

export function useAppRoute(): UseAppRouteResult {
  const [route, setRoute] = useState(() => parseAppRoute(window.location.hash));
  const pairRoute = route.route;

  useEffect(() => {
    const onHash = () => setRoute(parseAppRoute(window.location.hash));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return {
    route,
    pairRouteMode: pairRoute?.mode ?? null,
    pairRoutePairId: pairRoute?.pairId ?? null
  };
}
