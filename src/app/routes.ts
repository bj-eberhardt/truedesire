export type V2RouteMode = 'home' | 'pair' | 'ask' | 'played'

export type V2Route = {
  mode: V2RouteMode
  pairId: string | null
}

export function parseV2Route(hash: string): V2Route {
  const h = hash || '#/'
  const mPair = h.match(/^#\/pair\/([^/]+)$/)
  const mAsk = h.match(/^#\/pair\/([^/]+)\/ask$/)
  const mPlayed = h.match(/^#\/pair\/([^/]+)\/played$/)
  if (mAsk) return { pairId: decodeURIComponent(mAsk[1]), mode: 'ask' }
  if (mPlayed) return { pairId: decodeURIComponent(mPlayed[1]), mode: 'played' }
  if (mPair) return { pairId: decodeURIComponent(mPair[1]), mode: 'pair' }
  return { pairId: null, mode: 'home' }
}

export function goHome() {
  window.location.hash = '#/'
}

export function goPair(pairId: string) {
  window.location.hash = `#/pair/${encodeURIComponent(pairId)}`
}

export function goAsk(pairId: string) {
  window.location.hash = `#/pair/${encodeURIComponent(pairId)}/ask`
}

export function goPlayed(pairId: string) {
  window.location.hash = `#/pair/${encodeURIComponent(pairId)}/played`
}

