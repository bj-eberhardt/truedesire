export type UiVersion = 1 | 2 | 3

export type V2RouteMode = 'home' | 'pair' | 'ask' | 'played'

export type V2Route = {
  mode: V2RouteMode
  pairId: string | null
}

export type V3RouteMode = V2RouteMode | 'backup' | 'pairMatches' | 'pairSettings'

export type V3Route = {
  mode: V3RouteMode
  pairId: string | null
  onboard?: 'start' | 'backup' | 'new' | 'backup-save'
}

export type AppRoute =
  | { kind: 'versionHome' }
  | { kind: 'v1' }
  | { kind: 'v2'; route: V2Route }
  | { kind: 'v3'; route: V3Route }

function parseV2SubRoute(hashPath: string): V2Route {
  const h = hashPath || '/'
  const mPair = h.match(/^\/pair\/([^/]+)$/)
  const mAsk = h.match(/^\/pair\/([^/]+)\/ask$/)
  const mPlayed = h.match(/^\/pair\/([^/]+)\/played$/)
  if (mAsk) return { pairId: decodeURIComponent(mAsk[1]), mode: 'ask' }
  if (mPlayed) return { pairId: decodeURIComponent(mPlayed[1]), mode: 'played' }
  if (mPair) return { pairId: decodeURIComponent(mPair[1]), mode: 'pair' }
  return { pairId: null, mode: 'home' }
}

function parseV3SubRoute(hashPath: string): V3Route {
  const h = hashPath || '/'
  if (h.match(/^\/backup\/?$/)) return { pairId: null, mode: 'backup' }
  const mPairMatches = h.match(/^\/pair\/([^/]+)\/matches\/?$/)
  if (mPairMatches) return { pairId: decodeURIComponent(mPairMatches[1]), mode: 'pairMatches' }
  const mPairSettings = h.match(/^\/pair\/([^/]+)\/settings\/?$/)
  if (mPairSettings) return { pairId: decodeURIComponent(mPairSettings[1]), mode: 'pairSettings' }
  const mOnboard = h.match(/^\/onboarding(?:\/(start|backup|new|backup-save))?\/?$/)
  if (mOnboard) return { pairId: null, mode: 'home', onboard: (mOnboard[1] as V3Route['onboard']) ?? 'start' }
  if (h.match(/^\/import\/?$/)) return { pairId: null, mode: 'home', onboard: 'backup' }
  return parseV2SubRoute(h)
}

export function parseAppRoute(hash: string): AppRoute {
  const h = hash || '#/'
  if (h === '#/' || h === '#') return { kind: 'versionHome' }

  const mV1 = h.match(/^#\/v1\/?$/)
  if (mV1) return { kind: 'v1' }

  const mV2 = h.match(/^#\/v2(\/.*)?$/)
  if (mV2) return { kind: 'v2', route: parseV2SubRoute(mV2[1] ?? '/') }

  const mV3 = h.match(/^#\/v3(\/.*)?$/)
  if (mV3) return { kind: 'v3', route: parseV3SubRoute(mV3[1] ?? '/') }

  // Backwards compatibility: old v2 routes without version prefix.
  if (h.match(/^#\/pair\//)) return { kind: 'v2', route: parseV2SubRoute(h.replace(/^#/, '')) }

  // Unknown -> show version chooser.
  return { kind: 'versionHome' }
}

export function goHome() {
  window.location.hash = '#/'
}

export function goPair(pairId: string) {
  window.location.hash = `#/v2/pair/${encodeURIComponent(pairId)}`
}

export function goAsk(pairId: string) {
  window.location.hash = `#/v2/pair/${encodeURIComponent(pairId)}/ask`
}

export function goPlayed(pairId: string) {
  window.location.hash = `#/v2/pair/${encodeURIComponent(pairId)}/played`
}

export function goV1() {
  window.location.hash = '#/v1'
}

export function goV2() {
  window.location.hash = '#/v2'
}

export function goV3() {
  window.location.hash = '#/v3'
}

export function goV3Pair(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}`
}

export function goV3PairMatches(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/matches`
}

export function goV3PairSettings(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/settings`
}

export function goV3Ask(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/ask`
}

export function goV3Played(pairId: string) {
  window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}/played`
}

export function goV3Backup() {
  window.location.hash = '#/v3/backup'
}

export function goV3Onboarding(step: NonNullable<V3Route['onboard']>) {
  if (step === 'start') {
    window.location.hash = '#/v3'
    return
  }
  window.location.hash = `#/v3/onboarding/${step}`
}
