import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/api'
import type { Identity } from '../state/identity'

type ApiClient = ReturnType<typeof api>

export type PairingIncoming = Array<{ id: string; from: { id: string; code: string; nickname: string }; createdAt: number }>
export type PairingOutgoing = Array<{ id: string; to: { id: string; code: string; nickname: string }; createdAt: number }>
export type MyPairs = Array<{
  id: string
  status: 'pending' | 'active' | 'ended'
  weeklyLimit: number
  partnerDeleted: boolean
  partner: { id: string; nickname: string; code: string } | null
  updatedAt: number
}>

type UsePairingResult = {
  pairingIncoming: PairingIncoming
  pairingOutgoing: PairingOutgoing
  myPairs: MyPairs
  pairingInlineError: string | null
  clearPairingInlineError: () => void
  refreshPairing: (identityOverride?: Identity) => Promise<void>
  refreshPairingRequests: (identityOverride?: Identity) => Promise<void>
  sendPairRequest: (partnerCodeInput: string) => Promise<void>
  respond: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<{ pairId?: string | null }>
}

export function usePairing(apiClient: ApiClient | null, identity: Identity | null): UsePairingResult {
  const [pairingIncoming, setPairingIncoming] = useState<PairingIncoming>([])
  const [pairingOutgoing, setPairingOutgoing] = useState<PairingOutgoing>([])
  const [myPairs, setMyPairs] = useState<MyPairs>([])
  const [pairingInlineError, setPairingInlineError] = useState<string | null>(null)

  const getClient = useCallback(
    (identityOverride?: Identity) => {
      const id = identityOverride ?? identity
      if (!id?.userId) return null
      return (
        apiClient ??
        api({
          baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001',
          getAuthMaterial: async () => id.auth,
        })
      )
    },
    [apiClient, identity],
  )

  const refreshPairingRequests = useCallback(
    async (identityOverride?: Identity) => {
      const client = getClient(identityOverride)
      if (!client) return
      const reqs = await client.pairing.requests()
      setPairingIncoming(reqs.incoming)
      setPairingOutgoing(reqs.outgoing)
    },
    [getClient],
  )

  const refreshPairing = useCallback(
    async (identityOverride?: Identity) => {
      const client = getClient(identityOverride)
      if (!client) return
      const reqs = await client.pairing.requests()
      setPairingIncoming(reqs.incoming)
      setPairingOutgoing(reqs.outgoing)
      const pairs = await client.pairs.list()
      setMyPairs(pairs.pairs)
    },
    [getClient],
  )

  useEffect(() => {
    if (!identity?.userId) return
    ;(async () => {
      try {
        await refreshPairing(identity)
      } catch {
        // ignore initial refresh errors
      }
    })()
  }, [identity, refreshPairing])

  const sendPairRequest = useCallback(
    async (partnerCodeInput: string) => {
      if (!apiClient) return
      setPairingInlineError(null)
      const partnerCode = partnerCodeInput.trim().toUpperCase()
      if (!partnerCode) return
      try {
        await apiClient.pairing.request(partnerCode)
        await refreshPairing()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg === 'unknown_partner_code') {
          setPairingInlineError('Unbekannter Partner-Code. Bitte prüfen (Großbuchstaben/Zahlen).')
          return
        }
        if (msg === 'already_linked') {
          setPairingInlineError('Mit diesem Partner besteht bereits eine Verknüpfung.')
          return
        }
        if (msg === 'rate_limited') {
          setPairingInlineError('Zu viele Versuche in kurzer Zeit. Bitte warte kurz und versuche es erneut.')
          return
        }
        throw new Error(msg)
      }
    },
    [apiClient, refreshPairing],
  )

  const respond = useCallback(
    async (requestId: string, action: 'accept' | 'reject' | 'cancel') => {
      if (!apiClient) return { pairId: null }
      setPairingInlineError(null)
      const result = await apiClient.pairing.respond(requestId, action)
      await refreshPairing()
      return { pairId: result.pairId ?? null }
    },
    [apiClient, refreshPairing],
  )

  const clearPairingInlineError = useCallback(() => setPairingInlineError(null), [])

  return { pairingIncoming, pairingOutgoing, myPairs, pairingInlineError, clearPairingInlineError, refreshPairing, refreshPairingRequests, sendPairRequest, respond }
}
