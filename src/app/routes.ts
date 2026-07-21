export type V3RouteMode =
  | "home"
  | "welcome"
  | "pair"
  | "ask"
  | "played"
  | "backup"
  | "accountDeleted"
  | "pairMatches"
  | "pairSettings";

export type V3Route = {
  mode: V3RouteMode;
  pairId: string | null;
  onboard?: "start" | "backup" | "new" | "backup-save" | "pairing";
};

export type AppRoute = { kind: "v3"; route: V3Route };

function parseV3SubRoute(hashPath: string): V3Route {
  const h = hashPath || "/";
  if (new RegExp("^/backup/?$").test(h)) return { pairId: null, mode: "backup" };
  if (new RegExp("^/account-deleted/?$").test(h)) return { pairId: null, mode: "accountDeleted" };
  if (new RegExp("^/welcome/?$").test(h)) return { pairId: null, mode: "welcome" };
  const mPairMatches = h.match(new RegExp("^/pair/([^/]+)/matches/?$"));
  if (mPairMatches) return { pairId: decodeURIComponent(mPairMatches[1]), mode: "pairMatches" };
  const mPairSettings = h.match(new RegExp("^/pair/([^/]+)/settings/?$"));
  if (mPairSettings) return { pairId: decodeURIComponent(mPairSettings[1]), mode: "pairSettings" };
  const mOnboard = h.match(
    new RegExp("^/onboarding(?:/(start|backup|new|backup-save|pairing))?/?$")
  );
  if (mOnboard)
    return { pairId: null, mode: "home", onboard: (mOnboard[1] as V3Route["onboard"]) ?? "start" };
  if (new RegExp("^/import/?$").test(h)) return { pairId: null, mode: "home", onboard: "backup" };
  const mPair = h.match(new RegExp("^/pair/([^/]+)/?$"));
  const mAsk = h.match(new RegExp("^/pair/([^/]+)/ask/?$"));
  const mPlayed = h.match(new RegExp("^/pair/([^/]+)/played/?$"));
  if (mAsk) return { pairId: decodeURIComponent(mAsk[1]), mode: "ask" };
  if (mPlayed) return { pairId: decodeURIComponent(mPlayed[1]), mode: "played" };
  if (mPair) return { pairId: decodeURIComponent(mPair[1]), mode: "pair" };
  return { pairId: null, mode: "home" };
}

export function parseAppRoute(hash: string): AppRoute {
  const h = hash || "#/v3";
  const mV3 = h.match(new RegExp("^#/v3(/.*)?$"));
  if (mV3) return { kind: "v3", route: parseV3SubRoute(mV3[1] ?? "/") };

  const mRemovedVersion = h.match(new RegExp("^#/v[12](/.*)?$"));
  if (mRemovedVersion) return { kind: "v3", route: parseV3SubRoute(mRemovedVersion[1] ?? "/") };

  if (new RegExp("^#/pair/").test(h))
    return { kind: "v3", route: parseV3SubRoute(h.replace(/^#/, "")) };
  return { kind: "v3", route: { pairId: null, mode: "home" } };
}

export function goV3() {
  window.location.hash = "#/v3";
}

export function goV3Pair(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}`;
}

export function goV3PairMatches(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/matches`;
}

export function goV3PairSettings(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/settings`;
}

export function goV3Ask(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/ask`;
}

export function goV3Played(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/played`;
}

export function goV3Backup() {
  window.location.hash = "#/v3/backup";
}

export function goV3AccountDeleted() {
  window.location.hash = "#/v3/account-deleted";
}

export function goV3Welcome() {
  window.location.hash = "#/v3/welcome";
}

export function goV3Onboarding(step: NonNullable<V3Route["onboard"]>) {
  if (step === "start") {
    window.location.hash = "#/v3/welcome";
    return;
  }
  window.location.hash = `#/v3/onboarding/${step}`;
}
