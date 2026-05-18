import { useMemo } from 'react'
import { api } from '../api/api'
import type { Identity } from '../state/identity'

export function useApiClient(identity: Identity | null) {
  return useMemo(() => {
    if (!identity?.userId) return null
    return api({
      baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001',
      getAuthMaterial: async () => identity.auth,
    })
  }, [identity])
}

