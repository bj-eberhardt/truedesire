import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { idbGet, idbSet } from '../storage/idb'

type UseHiddenMatchesResult = {
  hiddenMatchIds: string[]
  setHiddenMatchIds: Dispatch<SetStateAction<string[]>>
  showHiddenMatches: boolean
  setShowHiddenMatches: Dispatch<SetStateAction<boolean>>
  visibleMatchesCount: (matchIds: string[]) => number
}

export function useHiddenMatches(pairId: string | null): UseHiddenMatchesResult {
  const [hiddenMatchIds, setHiddenMatchIds] = useState<string[]>([])
  const [showHiddenMatches, setShowHiddenMatches] = useState(false)

  const storageKey = useMemo(() => (pairId ? `ui:v2:hiddenMatches:${pairId}` : null), [pairId])

  useEffect(() => {
    if (!storageKey) {
      setHiddenMatchIds([])
      return
    }
    ;(async () => {
      const stored = await idbGet<string[]>(storageKey)
      setHiddenMatchIds(Array.isArray(stored) ? stored : [])
    })()
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    ;(async () => {
      await idbSet(storageKey, hiddenMatchIds)
    })()
  }, [storageKey, hiddenMatchIds])

  const visibleMatchesCount = useMemo(
    () => (matchIds: string[]) =>
      matchIds.filter((id) => (showHiddenMatches ? hiddenMatchIds.includes(id) : !hiddenMatchIds.includes(id))).length,
    [hiddenMatchIds, showHiddenMatches],
  )

  return { hiddenMatchIds, setHiddenMatchIds, showHiddenMatches, setShowHiddenMatches, visibleMatchesCount }
}
