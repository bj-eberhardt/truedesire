import type { AnswerView, EncryptedBlob, PairView, QuestionView } from '../types'
import { sha256Base64, signRequest } from '../crypto/sign'

type AuthMaterial = {
  userId: string
  signPrivateKey: CryptoKey
}

type ApiOpts = {
  baseUrl: string
  getAuthMaterial: () => Promise<AuthMaterial>
}

function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

type SignedInit = Omit<RequestInit, 'body'> & { body?: unknown }

async function signedFetch<T>(opts: ApiOpts, inputPath: string, init?: SignedInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const bodyText = typeof init?.body === 'string' ? init.body : init?.body !== undefined ? JSON.stringify(init.body) : ''
  const url = new URL(inputPath, opts.baseUrl)

  const { userId, signPrivateKey } = await opts.getAuthMaterial()
  const ts = String(Date.now())
  const n = nonce()
  const bodyHashB64 = await sha256Base64(bodyText)
  const signatureB64 = await signRequest(signPrivateKey, {
    method,
    pathWithQuery: url.pathname + url.search,
    timestamp: ts,
    nonce: n,
    bodyHashB64,
  })

  const res = await fetch(url.toString(), {
    ...(init ?? {}),
    method,
    body: bodyText ? bodyText : undefined,
    headers: {
      ...(init?.headers ?? {}),
      'content-type': 'application/json',
      'x-user-id': userId,
      'x-timestamp': ts,
      'x-nonce': n,
      'x-signature': signatureB64,
    },
  })

  const contentType = res.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const msg = typeof payload === 'string' ? payload : payload?.error ?? 'request_failed'
    throw new Error(msg)
  }
  return payload as T
}

export function api(opts: ApiOpts) {
  return {
    auth: {
      async register(params: { nickname: string; signPublicJwk: JsonWebKey; ecdhPublicRawB64: string }) {
        const res = await fetch(new URL('/auth/register', opts.baseUrl), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload?.error ?? 'register_failed')
        return payload as { userId: string }
      },
      me: () => signedFetch<{ id: string; code: string; nickname: string; ecdhPublicRawB64: string }>(opts, '/auth/me'),
      deleteMe: () => signedFetch<{ ok: true }>(opts, '/auth/delete', { method: 'POST', body: {} }),
    },
    pairing: {
      request: (partnerCode: string) =>
        signedFetch<{ ok: true; requestId: string }>(opts, '/pairing/request', { method: 'POST', body: { partnerCode } }),
      respond: (requestId: string, action: 'accept' | 'reject' | 'cancel') =>
        signedFetch<{ ok: true }>(opts, '/pairing/respond', { method: 'POST', body: { requestId, action } }),
      requests: () =>
        signedFetch<{
          incoming: Array<{ id: string; from: { id: string; code: string; nickname: string }; createdAt: number }>
          outgoing: Array<{ id: string; to: { id: string; code: string; nickname: string }; createdAt: number }>
        }>(opts, '/pairing/requests'),
    },
    pairs: {
      list: () =>
        signedFetch<{ pairs: Array<{ id: string; status: 'pending' | 'active'; weeklyLimit: number; partnerDeleted: boolean; partner: { id: string; nickname: string; code: string } | null; updatedAt: number }> }>(
          opts,
          '/pairs',
        ),
      unpair: (pairId: string) => signedFetch<{ ok: true }>(opts, '/pairs/unpair', { method: 'POST', body: { pairId } }),
      seedSystemQuestions: (pairId: string, items: Array<{ systemId: string; blob: EncryptedBlob }>) =>
        signedFetch<{ ok: true; alreadySeeded: boolean }>(opts, '/pairs/seed-system-questions', { method: 'POST', body: { pairId, items } }),
    },
    system: {
      questions: () => signedFetch<{ questions: Array<{ id: string; text: string; sha256B64: string }> }>(opts, '/system/questions'),
    },
    pair: {
      create: () => signedFetch<{ pairId: string }>(opts, '/pair/create', { method: 'POST', body: {} }),
      join: (pairId: string) => signedFetch<{ ok: true }>(opts, '/pair/join', { method: 'POST', body: { pairId } }),
      confirm: (pairId: string) =>
        signedFetch<{ ok: true; status: 'pending' | 'active' }>(opts, '/pair/confirm', { method: 'POST', body: { pairId } }),
      proposeWeeklyLimit: (pairId: string, limit: number) =>
        signedFetch<{ ok: true; weeklyLimit: number; pending: { id: string; proposedBy: string; limit: number; createdAt: number } }>(opts, '/pair/weekly-limit/propose', {
          method: 'POST',
          body: { pairId, limit },
        }),
      respondWeeklyLimit: (pairId: string, proposalId: string, action: 'accept' | 'reject' | 'cancel') =>
        signedFetch<{ ok: true; weeklyLimit: number }>(opts, '/pair/weekly-limit/respond', { method: 'POST', body: { pairId, proposalId, action } }),
      get: async (pairId: string): Promise<PairView> => {
        const raw = await signedFetch<any>(opts, `/pair/${encodeURIComponent(pairId)}`)
        const auth = await opts.getAuthMaterial()
        const meIsA = raw?.userA?.id === auth.userId
        const me = meIsA ? raw.userA : raw.userB
        const partner = meIsA ? raw.userB : raw.userA
        return {
          id: raw.id,
          status: raw.status,
          weeklyLimit: raw.weeklyLimit,
          seededSystemQuestionsAt: raw.seededSystemQuestionsAt ?? null,
          weeklyLimitPending: raw.weeklyLimitPending ?? null,
          usage: raw.usage ?? undefined,
          partnerDeleted: raw.partnerDeleted ?? false,
          confirmA: raw.confirmA,
          confirmB: raw.confirmB,
          me,
          partner: partner ?? null,
        } as PairView
      },
    },
    questions: {
      create: (pairId: string, blob: EncryptedBlob) =>
        signedFetch<QuestionView>(opts, '/questions', { method: 'POST', body: { pairId, blob } }),
      list: (pairId: string) => signedFetch<QuestionView[]>(opts, `/questions/${encodeURIComponent(pairId)}`),
      delete: (questionId: string) => signedFetch<{ ok: true }>(opts, '/questions/delete', { method: 'POST', body: { questionId } }),
    },
    answers: {
      create: (questionId: string, blob: EncryptedBlob) =>
        signedFetch<AnswerView>(opts, '/answers', { method: 'POST', body: { questionId, blob } }),
      upsert: (questionId: string, blob: EncryptedBlob) =>
        signedFetch<{ ok: true; updated: boolean }>(opts, '/answers/upsert', { method: 'POST', body: { questionId, blob } }),
      list: (questionId: string) => signedFetch<AnswerView[]>(opts, `/answers/${encodeURIComponent(questionId)}`),
      listByPair: (pairId: string) => signedFetch<AnswerView[]>(opts, `/answers/by-pair/${encodeURIComponent(pairId)}`),
    },
  }
}
