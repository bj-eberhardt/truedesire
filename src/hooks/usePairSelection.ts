import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/api'
import type { Identity } from '../state/identity'
import { idbGet, idbSet } from '../storage/idb'
import type { PairView } from '../types'

type ApiClient = ReturnType<typeof api>

type UsePairSelectionResult = {
  pair: PairView | null
  setPair: (p: PairView | null) => void
  weeklyLimitInput: string
  setWeeklyLimitInput: (v: string) => void
  v2AllowAllQuestions: boolean
  setV2AllowAllQuestions: (v: boolean) => void
  answerLimitReached: boolean
  isLoadingPairData: boolean
  isLoadingGroupSettings: boolean
  selectPair: (pairId: string) => Promise<PairView | null>
  refreshCurrentPair: () => Promise<void>
  refreshGroupSettingsPanel: () => Promise<void>
  proposeWeeklyLimit: () => Promise<void>
  respondWeeklyLimit: (action: 'accept' | 'reject' | 'cancel') => Promise<void>
  proposeV2GroupSettings: () => Promise<void>
  respondV2GroupSettings: (action: 'accept' | 'reject' | 'cancel') => Promise<void>
  loadLastPairIfAny: (identityOverride?: Identity | null) => Promise<void>
}

export function usePairSelection(opts: {
  apiClient: ApiClient | null
  identity: Identity | null
  refreshPairing: (identityOverride?: Identity) => Promise<void>
  minLoadingMs?: number
}): UsePairSelectionResult {
  const { apiClient, identity, refreshPairing, minLoadingMs = 1500 } = opts
  const [pair, setPair] = useState<PairView | null>(null)
  const [weeklyLimitInput, setWeeklyLimitInput] = useState('15')
  const [v2AllowAllQuestions, setV2AllowAllQuestions] = useState(false)
  const [answerLimitReached, setAnswerLimitReached] = useState(false)
  const [isLoadingPairData, setIsLoadingPairData] = useState(false)
  const [isLoadingGroupSettings, setIsLoadingGroupSettings] = useState(false)
  const inFlightRef = useRef(false)

  const baseUrl = useMemo(() => import.meta.env.VITE_API_BASE ?? 'http://localhost:3001', [])

  const updateDerivedLimits = useCallback((p: PairView) => {
    setWeeklyLimitInput(String(p.weeklyLimit))
    setV2AllowAllQuestions((p.usage?.weeklyLimit ?? p.weeklyLimit) === 0)
    const weeklyLimit = p.usage?.weeklyLimit ?? p.weeklyLimit
    const answeredThisWeek = p.usage?.answeredThisWeek ?? 0
    setAnswerLimitReached(weeklyLimit > 0 && answeredThisWeek >= weeklyLimit)
  }, [])

  const refreshCurrentPair = useCallback(async () => {
    if (!apiClient || !pair) return
    try {
      const p = await apiClient.pair.get(pair.id)
      setPair(p)
      updateDerivedLimits(p)
    } catch {
      // ignore
    }
  }, [apiClient, pair, updateDerivedLimits])

  const loadLastPairIfAny = useCallback(
    async (identityOverride?: Identity | null) => {
      const last = await idbGet<string>('ui:lastPairId')
      if (!last) return
      const id = identityOverride ?? identity
      if (!id?.userId) return
      const client =
        apiClient ??
        api({
          baseUrl,
          getAuthMaterial: async () => id.auth,
        })
      try {
        const p = await client.pair.get(last)
        setPair(p)
        updateDerivedLimits(p)
      } catch {
        // ignore
      }
    },
    [apiClient, baseUrl, identity, updateDerivedLimits],
  )

  const selectPair = useCallback(
    async (pairId: string) => {
      if (!apiClient) return null
      if (inFlightRef.current) return null
      inFlightRef.current = true
      const startedAt = Date.now()
      setIsLoadingPairData(true)
      try {
        const p = await apiClient.pair.get(pairId)
        setPair(p)
        updateDerivedLimits(p)
        await idbSet('ui:lastPairId', pairId)
        await refreshPairing()
        return p
      } finally {
        const elapsed = Date.now() - startedAt
        if (elapsed < minLoadingMs) await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed))
        setIsLoadingPairData(false)
        inFlightRef.current = false
      }
    },
    [apiClient, minLoadingMs, refreshPairing, updateDerivedLimits],
  )

  const refreshGroupSettingsPanel = useCallback(async () => {
    if (!pair?.id) return
    const startedAt = Date.now()
    setIsLoadingGroupSettings(true)
    try {
      await refreshCurrentPair()
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < minLoadingMs) await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed))
      setIsLoadingGroupSettings(false)
    }
  }, [minLoadingMs, pair?.id, refreshCurrentPair])

  const proposeWeeklyLimit = useCallback(async () => {
    if (!apiClient || !pair) return
    const limit = Number(weeklyLimitInput)
    if (!Number.isFinite(limit)) return
    await apiClient.pair.proposeWeeklyLimit(pair.id, limit)
    await selectPair(pair.id)
  }, [apiClient, pair, selectPair, weeklyLimitInput])

  const proposeV2GroupSettings = useCallback(async () => {
    if (!apiClient || !pair) return
    const limit = v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)
    if (!Number.isFinite(limit) || limit < 0 || limit > 50) return
    const currentLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
    if (limit === currentLimit) return
    await apiClient.pair.proposeWeeklyLimit(pair.id, limit)
    await refreshGroupSettingsPanel()
  }, [apiClient, pair, refreshGroupSettingsPanel, v2AllowAllQuestions, weeklyLimitInput])

  const respondWeeklyLimit = useCallback(
    async (action: 'accept' | 'reject' | 'cancel') => {
      if (!apiClient || !pair?.weeklyLimitPending) return
      await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action)
      await selectPair(pair.id)
    },
    [apiClient, pair, selectPair],
  )

  const respondV2GroupSettings = useCallback(
    async (action: 'accept' | 'reject' | 'cancel') => {
      if (!apiClient || !pair?.weeklyLimitPending) return
      await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action)
      await refreshGroupSettingsPanel()
    },
    [apiClient, pair, refreshGroupSettingsPanel],
  )

  // keep weeklyLimitInput aligned when selecting another pair externally
  useEffect(() => {
    if (!pair) return
    updateDerivedLimits(pair)
  }, [pair, updateDerivedLimits])

  return {
    pair,
    setPair,
    weeklyLimitInput,
    setWeeklyLimitInput,
    v2AllowAllQuestions,
    setV2AllowAllQuestions,
    answerLimitReached,
    isLoadingPairData,
    isLoadingGroupSettings,
    selectPair,
    refreshCurrentPair,
    refreshGroupSettingsPanel,
    proposeWeeklyLimit,
    respondWeeklyLimit,
    proposeV2GroupSettings,
    respondV2GroupSettings,
    loadLastPairIfAny,
  }
}
