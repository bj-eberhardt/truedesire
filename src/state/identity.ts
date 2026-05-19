import { api } from '../api/api'
import { generateKeys, importRuntimeKeys, type KeyBundle, type RuntimeKeys } from '../crypto/keys'
import { idbDel, idbGet, idbSet } from '../storage/idb'

const KEY_IDENTITY = 'identity:v1'

type StoredIdentity = {
  userId: string | null
  nickname: string
  code: string | null
  keys: KeyBundle
}

export type Identity = {
  userId: string | null
  code: string | null
  nickname: string
  keys: RuntimeKeys
  auth: { userId: string; signPrivateKey: CryptoKey }
}

async function loadStored(): Promise<StoredIdentity | null> {
  return (await idbGet<StoredIdentity>(KEY_IDENTITY)) ?? null
}

async function saveStored(next: StoredIdentity): Promise<void> {
  await idbSet(KEY_IDENTITY, next)
}

export async function loadIdentity(opts?: { nickname?: string; ensureRegistered?: boolean }): Promise<Identity | null> {
  const baseUrl = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'
  const stored = await loadStored()

  if (!stored) {
    const keys = await generateKeys()
    const nickname = (opts?.nickname ?? 'Anon').slice(0, 30)
    const next: StoredIdentity = { userId: null, nickname, code: null, keys }
    await saveStored(next)
    const runtime = await importRuntimeKeys(keys)
    const identity: Identity = { userId: null, code: null, nickname, keys: runtime, auth: { userId: '', signPrivateKey: runtime.signPrivateKey } }

    // If requested, immediately register this newly created identity on the server.
    if (opts?.ensureRegistered) {
      const client = api({
        baseUrl,
        getAuthMaterial: async () => ({ userId: '', signPrivateKey: runtime.signPrivateKey }),
      })
      const res = await client.auth.register({
        nickname,
        signPublicJwk: keys.signPublicJwk,
        ecdhPublicRawB64: keys.ecdhPublicRawB64,
      })
      next.userId = res.userId
      await saveStored(next)
      identity.userId = res.userId
      identity.auth.userId = res.userId

      // hydrate code + canonical nickname
      const authed = api({
        baseUrl,
        getAuthMaterial: async () => ({ userId: res.userId, signPrivateKey: runtime.signPrivateKey }),
      })
      const me = await authed.auth.me()
      next.code = me.code
      next.nickname = me.nickname
      await saveStored(next)
      identity.code = me.code
      identity.nickname = me.nickname
    }

    return identity
  }

  const runtime = await importRuntimeKeys(stored.keys)
  const identity: Identity = {
    userId: stored.userId,
    code: stored.code ?? null,
    nickname: stored.nickname,
    keys: runtime,
    auth: { userId: stored.userId ?? '', signPrivateKey: runtime.signPrivateKey },
  }

  if (opts?.nickname && opts.nickname !== stored.nickname) {
    stored.nickname = opts.nickname.slice(0, 30)
    await saveStored(stored)
    identity.nickname = stored.nickname
  }

  if (opts?.ensureRegistered) {
    if (!stored.userId) {
      const client = api({
        baseUrl,
        getAuthMaterial: async () => ({ userId: '', signPrivateKey: runtime.signPrivateKey }),
      })
      const res = await client.auth.register({
        nickname: stored.nickname,
        signPublicJwk: stored.keys.signPublicJwk,
        ecdhPublicRawB64: stored.keys.ecdhPublicRawB64,
      })
      stored.userId = res.userId
      stored.code = null
      await saveStored(stored)
      identity.userId = res.userId
      identity.auth.userId = res.userId
    }

    if (stored.userId) {
      const client = api({
        baseUrl,
        getAuthMaterial: async () => ({ userId: stored.userId!, signPrivateKey: runtime.signPrivateKey }),
      })
      const me = await client.auth.me()
      stored.code = me.code
      stored.nickname = me.nickname
      await saveStored(stored)
      identity.code = me.code
      identity.nickname = me.nickname
    }
  }

  return identity
}

export async function exportBackup(): Promise<string> {
  const stored = await loadStored()
  if (!stored) throw new Error('no_identity')
  return JSON.stringify(stored)
}

export async function importBackup(text: string): Promise<void> {
  const parsed = JSON.parse(text) as StoredIdentity
  if (!parsed?.keys?.signPrivateJwk || !parsed?.keys?.ecdhPrivateJwk) throw new Error('bad_backup')
  await saveStored({
    userId: parsed.userId ?? null,
    nickname: String(parsed.nickname ?? 'Anon').slice(0, 30),
    code: parsed.code ?? null,
    keys: parsed.keys,
  })
}

export async function resetIdentity(): Promise<void> {
  await idbDel(KEY_IDENTITY)
}
