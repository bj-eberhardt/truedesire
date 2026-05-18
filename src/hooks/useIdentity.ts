import { useCallback, useEffect, useState } from 'react'
import { loadIdentity, resetIdentity, type Identity } from '../state/identity'

type UseIdentityResult = {
  identity: Identity | null
  nickname: string
  setNickname: (next: string) => void
  isBootstrappingAccount: boolean
  setIdentity: (next: Identity | null) => void
  bootstrap: () => Promise<void>
  register: () => Promise<void>
  resetLocalIdentity: () => Promise<void>
}

export function useIdentity(): UseIdentityResult {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [nickname, setNickname] = useState('')
  const [isBootstrappingAccount, setIsBootstrappingAccount] = useState(true)

  const bootstrap = useCallback(async () => {
    setIsBootstrappingAccount(true)
    try {
      const id = await loadIdentity()
      const hydrated = id?.userId ? await loadIdentity({ ensureRegistered: true }) : id
      setIdentity(hydrated)
      setNickname(hydrated?.nickname ?? '')
    } finally {
      setIsBootstrappingAccount(false)
    }
  }, [])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const register = useCallback(async () => {
    const next = await loadIdentity({ nickname: nickname.trim() || 'Anon', ensureRegistered: true })
    if (!next) throw new Error('identity_not_available')
    setIdentity(next)
    setNickname(next.nickname)
  }, [nickname])

  const resetLocalIdentity = useCallback(async () => {
    await resetIdentity()
    setIdentity(null)
    setNickname('')
  }, [])

  return { identity, nickname, setNickname, isBootstrappingAccount, setIdentity, bootstrap, register, resetLocalIdentity }
}

