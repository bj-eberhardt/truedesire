import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { webcrypto as crypto } from 'node:crypto'
import { createHash } from 'node:crypto'
import { dbStore, type AnswerRecord, type PairRecord, type PairRequestRecord, type QuestionRecord } from './storage/db.js'
import { verifyRequestSignature } from './crypto/auth.js'
import { isoWeekKey } from './utils/week.js'
import { newId } from './crypto/auth.js'

type Json = any

const DEFAULT_WEEKLY_LIMIT = Number(process.env.WEEKLY_LIMIT_DEFAULT ?? 15)
const SYSTEM_QUESTIONS_FILE = process.env.SYSTEM_QUESTIONS_FILE || path.join(process.cwd(), 'server', 'data', 'system-questions.json')
const PAIRING_LIMIT_USER_PER_MIN = Number(process.env.PAIRING_LIMIT_USER_PER_MIN ?? 10)
const PAIRING_LIMIT_USER_PER_HOUR = Number(process.env.PAIRING_LIMIT_USER_PER_HOUR ?? 50)
const PAIRING_LIMIT_IP_PER_MIN = Number(process.env.PAIRING_LIMIT_IP_PER_MIN ?? 30)
const PAIRING_LIMIT_IP_PER_HOUR = Number(process.env.PAIRING_LIMIT_IP_PER_HOUR ?? 200)

const pairingReqTimestampsByUser = new Map<string, number[]>()
const pairingReqTimestampsByIp = new Map<string, number[]>()

function json(res: http.ServerResponse, status: number, body: Json) {
  const data = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(data.length),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-user-id,x-timestamp,x-nonce,x-signature',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  })
  res.end(data)
}

function text(res: http.ServerResponse, status: number, body: string) {
  const data = Buffer.from(body, 'utf8')
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': String(data.length),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-user-id,x-timestamp,x-nonce,x-signature',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  })
  res.end(data)
}

function bad(res: http.ServerResponse, code: string, status = 400) {
  return json(res, status, { error: code })
}

function getClientIp(req: http.IncomingMessage): string {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').trim()
  if (forwarded) return forwarded.split(',')[0].trim()
  const remote = req.socket?.remoteAddress ?? ''
  return remote || 'unknown'
}

function pruneTimestamps(values: number[], now: number, maxWindowMs: number): number[] {
  const min = now - maxWindowMs
  return values.filter((t) => t >= min)
}

function consumeRateLimit(bucket: Map<string, number[]>, key: string, now: number, perMin: number, perHour: number): boolean {
  const current = pruneTimestamps(bucket.get(key) ?? [], now, 60 * 60 * 1000)
  const inLastMinute = current.filter((t) => t >= now - 60 * 1000).length
  const inLastHour = current.length
  if (inLastMinute >= perMin || inLastHour >= perHour) {
    bucket.set(key, current)
    return false
  }
  current.push(now)
  bucket.set(key, current)
  return true
}

function pruneNonceList(list: { nonce: string; expiresAt: number }[], now: number) {
  return list.filter((x) => x.expiresAt > now)
}

async function requireAuth(req: http.IncomingMessage, rawBody: Uint8Array): Promise<{ userId: string } | null> {
  const userId = String(req.headers['x-user-id'] ?? '')
  const timestamp = String(req.headers['x-timestamp'] ?? '')
  const nonce = String(req.headers['x-nonce'] ?? '')
  const signatureB64 = String(req.headers['x-signature'] ?? '')

  if (!userId || !timestamp || !nonce || !signatureB64) return null
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return null

  const now = Date.now()
  const maxSkewMs = 5 * 60 * 1000
  if (Math.abs(now - ts) > maxSkewMs) return null

  const ttlMs = 10 * 60 * 1000
  const db = dbStore.readSync()
  const user = db.users.find((u) => u.id === userId)
  if (!user) return null
  if ((user as any).deletedAt) return null

  const existing = db.nonces[userId] ?? []
  const pruned = pruneNonceList(existing, now)
  if (pruned.some((x) => x.nonce === nonce)) return null
  const nextList = [...pruned, { nonce, expiresAt: now + ttlMs }]
  const maxPerUser = 500
  db.nonces[userId] = nextList.slice(Math.max(0, nextList.length - maxPerUser))
  await dbStore.write(db)

  const url = new URL(req.url ?? '/', 'http://localhost')
  const ok = await verifyRequestSignature({
    signPublicJwk: user.signPublicJwk,
    method: req.method ?? 'GET',
    pathWithQuery: url.pathname + url.search,
    timestamp,
    nonce,
    rawBody,
    signatureB64,
  })
  if (!ok) return null
  return { userId }
}

async function readBody(req: http.IncomingMessage): Promise<{ raw: Buffer; json: any | null }> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  const raw = Buffer.concat(chunks)
  const ct = String(req.headers['content-type'] ?? '')
  if (!raw.length) return { raw, json: null }
  if (!ct.includes('application/json')) return { raw, json: null }
  try {
    return { raw, json: JSON.parse(raw.toString('utf8')) }
  } catch {
    return { raw, json: null }
  }
}

function normalizeDb(input: any) {
  return {
    users: Array.isArray(input?.users) ? input.users : [],
    pairs: Array.isArray(input?.pairs) ? input.pairs : [],
    pairRequests: Array.isArray(input?.pairRequests) ? input.pairRequests : [],
    questions: Array.isArray(input?.questions) ? input.questions : [],
    answers: Array.isArray(input?.answers) ? input.answers : [],
    nonces: typeof input?.nonces === 'object' && input.nonces ? input.nonces : {},
  }
}

function requirePairMember(db: any, pairId: string, userId: string): PairRecord | null {
  const pair = db.pairs.find((p: PairRecord) => p.id === pairId)
  if (!pair) return null
  if (![pair.userA, pair.userB].includes(userId)) return null
  return pair
}

function isPartnerDeleted(db: any, pair: PairRecord, userId: string): boolean {
  const otherId = pair.userA === userId ? pair.userB : pair.userA
  if (!otherId) return false
  const other = db.users.find((u: any) => u.id === otherId)
  return !!other?.deletedAt
}

function answeredThisWeekForLimit(db: any, pairId: string, userId: string, now: number): number {
  const week = isoWeekKey(now)
  const questionsById = new Map<string, any>(db.questions.map((q: any) => [q.id, q]))
  return db.answers.filter((a: any) => {
    if (a.pairId !== pairId) return false
    if (a.userId !== userId) return false
    if (isoWeekKey(a.createdAt) !== week) return false
    const q = questionsById.get(a.questionId)
    // Own questions don't count against limit (matches server enforcement).
    if (q && q.createdBy === userId) return false
    return true
  }).length
}

function makeUserCode(existing: Set<string>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 1000; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6))
    let code = ''
    for (const b of bytes) code += alphabet[b % alphabet.length]
    if (!existing.has(code)) return code
  }
  return newId().slice(0, 8).toUpperCase()
}

function getUserByCode(db: any, code: string) {
  return db.users.find((u: any) => u.code === code && !u.deletedAt)
}

function ensurePairForUsers(db: any, user1: string, user2: string): PairRecord {
  const [a, b] = [user1, user2].sort()
  const existing = db.pairs.find((p: PairRecord) => {
    const ids = [p.userA, p.userB].filter(Boolean).sort()
    return ids.length === 2 && ids[0] === a && ids[1] === b
  })
  if (existing) return existing
  const pair: PairRecord = {
    id: newId().slice(0, 8),
    userA: a,
    userB: b,
    confirmA: true,
    confirmB: true,
    status: 'active',
    weeklyLimit: DEFAULT_WEEKLY_LIMIT,
    weeklyLimitProposals: {},
    weeklyLimitPending: null,
    seededSystemQuestionsAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  db.pairs.push(pair)
  return pair
}

function findMutualAcceptedRequest(db: any, u1: string, u2: string): boolean {
  const a = db.pairRequests.find((r: PairRequestRecord) => r.fromUserId === u1 && r.toUserId === u2 && r.status === 'accepted')
  const b = db.pairRequests.find((r: PairRequestRecord) => r.fromUserId === u2 && r.toUserId === u1 && r.status === 'accepted')
  return !!(a && b)
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return bad(res, 'bad_request')

  if (req.method === 'OPTIONS') return text(res, 204, '')

  const url = new URL(req.url, 'http://localhost')
  const { raw, json: body } = await readBody(req)

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true })

  if (req.method === 'POST' && url.pathname === '/auth/register') {
    const nickname = typeof body?.nickname === 'string' ? body.nickname.slice(0, 40) : 'Anon'
    const signPublicJwk = body?.signPublicJwk as JsonWebKey | undefined
    const ecdhPublicRawB64 = body?.ecdhPublicRawB64 as string | undefined
    if (!signPublicJwk || !ecdhPublicRawB64) return bad(res, 'bad_request')
    if (typeof ecdhPublicRawB64 !== 'string' || ecdhPublicRawB64.length < 16) return bad(res, 'bad_ecdh_public')

    const db = normalizeDb(dbStore.readSync())
    const userId = newId()
    const existingCodes = new Set<string>(db.users.map((u: any) => u.code).filter(Boolean))
    const code = makeUserCode(existingCodes)
    db.users.push({ id: userId, code, nickname, deletedAt: null, signPublicJwk, ecdhPublicRawB64, createdAt: Date.now() })
    await dbStore.write(db)
    return json(res, 200, { userId })
  }

  const auth = await requireAuth(req, raw)
  if (!auth) return bad(res, 'unauthorized', 401)
  const userId = auth.userId

  if (req.method === 'GET' && url.pathname === '/auth/me') {
    const db = normalizeDb(dbStore.readSync())
    const user = db.users.find((u: any) => u.id === userId)
    if (!user) return bad(res, 'not_found', 404)
    return json(res, 200, { id: user.id, code: (user as any).code, nickname: user.nickname, ecdhPublicRawB64: user.ecdhPublicRawB64 })
  }

  if (req.method === 'POST' && url.pathname === '/auth/delete') {
    const db = normalizeDb(dbStore.readSync())
    const user = db.users.find((u: any) => u.id === userId)
    if (!user) return bad(res, 'not_found', 404)
    const now = Date.now()
    user.deletedAt = now
    user.nickname = 'Gelöscht'
    user.code = ''
    // Remove pending pairing requests involving this user.
    db.pairRequests = db.pairRequests.filter((r: any) => r.fromUserId !== userId && r.toUserId !== userId)
    await dbStore.write(db)
    return json(res, 200, { ok: true })
  }

  // New pairing flow (multi-pair):
  // - Each user has a short "code" shown in UI.
  // - Both users send a request to the other's code.
  // - Both accept => server creates/ensures an active pair.
  if (req.method === 'POST' && url.pathname === '/pairing/request') {
    const now = Date.now()
    const ip = getClientIp(req)
    const okUserLimit = consumeRateLimit(pairingReqTimestampsByUser, userId, now, PAIRING_LIMIT_USER_PER_MIN, PAIRING_LIMIT_USER_PER_HOUR)
    const okIpLimit = consumeRateLimit(pairingReqTimestampsByIp, ip, now, PAIRING_LIMIT_IP_PER_MIN, PAIRING_LIMIT_IP_PER_HOUR)
    if (!okUserLimit || !okIpLimit) return bad(res, 'rate_limited', 429)

    const partnerCode = String(body?.partnerCode ?? '').toUpperCase().trim()
    if (!partnerCode) return bad(res, 'bad_request')
    const db = normalizeDb(dbStore.readSync())
    const me = db.users.find((u: any) => u.id === userId)
    if (!me) return bad(res, 'unknown_user', 401)
    const partner = getUserByCode(db, partnerCode)
    if (!partner) return bad(res, 'unknown_partner_code', 404)
    if (partner.id === userId) return bad(res, 'cannot_pair_self', 400)
    // Prevent duplicate linking attempts when a pair already exists between these users.
    const [a, b] = [userId, partner.id].sort()
    const existingPair = db.pairs.find((p: PairRecord) => {
      const ids = [p.userA, p.userB].filter(Boolean).sort()
      return ids.length === 2 && ids[0] === a && ids[1] === b
    })
    if (existingPair) return bad(res, 'already_linked', 409)

    const existing = db.pairRequests.find((r: PairRequestRecord) => r.fromUserId === userId && r.toUserId === partner.id && r.status === 'pending')
    if (existing) return json(res, 200, { ok: true, requestId: existing.id })

    const reqRec: PairRequestRecord = {
      id: newId(),
      fromUserId: userId,
      toUserId: partner.id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    db.pairRequests.push(reqRec)
    await dbStore.write(db)
    return json(res, 200, { ok: true, requestId: reqRec.id })
  }

  if (req.method === 'POST' && url.pathname === '/pairing/respond') {
    const requestId = String(body?.requestId ?? '')
    const action = String(body?.action ?? '')
    if (!requestId || !['accept', 'reject', 'cancel'].includes(action)) return bad(res, 'bad_request')
    const db = normalizeDb(dbStore.readSync())
    const r = db.pairRequests.find((x: PairRequestRecord) => x.id === requestId)
    if (!r) return bad(res, 'not_found', 404)

    const isIncoming = r.toUserId === userId
    const isOutgoing = r.fromUserId === userId
    if (action === 'cancel' && !isOutgoing) return bad(res, 'forbidden', 403)
    if ((action === 'accept' || action === 'reject') && !isIncoming) return bad(res, 'forbidden', 403)

    if (action === 'accept') r.status = 'accepted'
    if (action === 'reject') r.status = 'rejected'
    if (action === 'cancel') r.status = 'canceled'
    r.updatedAt = Date.now()

    if (r.status === 'accepted' && findMutualAcceptedRequest(db, r.fromUserId, r.toUserId)) {
      ensurePairForUsers(db, r.fromUserId, r.toUserId)
    }

    await dbStore.write(db)
    return json(res, 200, { ok: true })
  }

  if (req.method === 'GET' && url.pathname === '/pairing/requests') {
    const db = normalizeDb(dbStore.readSync())
    const me = db.users.find((u: any) => u.id === userId)
    if (!me) return bad(res, 'unknown_user', 401)

    const usersById = new Map<string, any>(db.users.map((u: any) => [u.id, u]))
    const incoming = db.pairRequests
      .filter((r: PairRequestRecord) => r.toUserId === userId && r.status === 'pending')
      .map((r: PairRequestRecord) => {
        const from = usersById.get(r.fromUserId)
        return { id: r.id, from: { id: from?.id, code: from?.code, nickname: from?.nickname }, createdAt: r.createdAt }
      })
    const outgoing = db.pairRequests
      .filter((r: PairRequestRecord) => r.fromUserId === userId && r.status === 'pending')
      .map((r: PairRequestRecord) => {
        const to = usersById.get(r.toUserId)
        return { id: r.id, to: { id: to?.id, code: to?.code, nickname: to?.nickname }, createdAt: r.createdAt }
      })
    return json(res, 200, { incoming, outgoing })
  }

  if (req.method === 'GET' && url.pathname === '/pairs') {
    const db = normalizeDb(dbStore.readSync())
    const usersById = new Map<string, any>(db.users.map((u: any) => [u.id, u]))
    const pairs = db.pairs
      .filter((p: PairRecord) => [p.userA, p.userB].includes(userId))
      .map((p: PairRecord) => {
        const otherId = p.userA === userId ? p.userB : p.userA
        const other = otherId ? usersById.get(otherId) : null
        const partnerDeleted = !!other?.deletedAt
        return {
          id: p.id,
          status: p.status,
          weeklyLimit: p.weeklyLimit,
          partnerDeleted,
          partner: other
            ? { id: other.id, nickname: partnerDeleted ? 'Gelöscht' : other.nickname, code: partnerDeleted ? '' : other.code }
            : null,
          updatedAt: p.updatedAt,
        }
      })
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt)
    return json(res, 200, { pairs })
  }

  if (req.method === 'GET' && url.pathname === '/system/questions') {
    const filename = SYSTEM_QUESTIONS_FILE
    try {
      const raw = fs.readFileSync(filename, 'utf8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return bad(res, 'bad_system_questions', 500)
      const items = parsed
        .filter((x: any) => x && typeof x.id === 'string' && typeof x.text === 'string')
        .map((x: any) => {
          const sha256B64 = createHash('sha256').update(String(x.text), 'utf8').digest('base64')
          return { id: x.id, text: x.text, sha256B64 }
        })
      return json(res, 200, { questions: items })
    } catch {
      return bad(res, 'system_questions_unavailable', 500)
    }
  }

  if (req.method === 'POST' && url.pathname === '/pairs/seed-system-questions') {
    const pairId = String(body?.pairId ?? '')
    const items = Array.isArray(body?.items) ? body.items : null
    if (!pairId || !items) return bad(res, 'bad_request')

    const db = normalizeDb(dbStore.readSync())
    const pair = db.pairs.find((p: any) => p.id === pairId)
    if (!pair) return bad(res, 'not_found', 404)
    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
    if (pair.status !== 'active') return bad(res, 'pair_not_active', 409)

    if (pair.seededSystemQuestionsAt) return json(res, 200, { ok: true, alreadySeeded: true })

    const now = Date.now()
    for (const it of items) {
      const systemId = String(it?.systemId ?? '')
      const blob = it?.blob
      if (!systemId || !blob?.ciphertextB64 || !blob?.ivB64 || !blob?.aadB64) return bad(res, 'bad_request')
      const q: QuestionRecord = {
        id: newId(),
        pairId,
        createdBy: 'computer',
        createdAt: now,
        blob: { ...blob, schemaVersion: 1 },
      }
      db.questions.push(q)
    }
    pair.seededSystemQuestionsAt = now
    pair.updatedAt = now
    await dbStore.write(db)
    return json(res, 200, { ok: true, alreadySeeded: false })
  }

  if (req.method === 'POST' && url.pathname === '/pairs/unpair') {
    const pairId = String(body?.pairId ?? '')
    if (!pairId) return bad(res, 'bad_request')
    const db = normalizeDb(dbStore.readSync())
    const pair = db.pairs.find((p: PairRecord) => p.id === pairId)
    if (!pair) return bad(res, 'not_found', 404)
    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
    db.pairs = db.pairs.filter((p: PairRecord) => p.id !== pairId)
    await dbStore.write(db)
    return json(res, 200, { ok: true })
  }

  // Legacy endpoints (kept for compatibility with older clients)
	  if (req.method === 'POST' && url.pathname === '/pair/create') {
	    const db = normalizeDb(dbStore.readSync())
	    const pairId = newId().slice(0, 8)
	    const pair: PairRecord = {
	      id: pairId,
	      userA: userId,
	      userB: null,
	      confirmA: false,
	      confirmB: false,
	      status: 'pending',
	      weeklyLimit: DEFAULT_WEEKLY_LIMIT,
	      weeklyLimitProposals: {},
	      weeklyLimitPending: null,
	      seededSystemQuestionsAt: null,
	      createdAt: Date.now(),
	      updatedAt: Date.now(),
	    }
	    db.pairs.push(pair)
	    await dbStore.write(db)
	    return json(res, 200, { pairId })
	  }

  if (req.method === 'POST' && url.pathname === '/pair/join') {
    const pairId = String(body?.pairId ?? '')
    if (!pairId) return bad(res, 'bad_request')
    const db = dbStore.readSync()
    const pair = db.pairs.find((p: any) => p.id === pairId)
    if (!pair) return bad(res, 'not_found', 404)
    if (pair.userA === userId) return bad(res, 'cannot_join_own_pair', 400)
    if (pair.userB && pair.userB !== userId) return bad(res, 'pair_full', 409)
    pair.userB = userId
    pair.updatedAt = Date.now()
    await dbStore.write(db)
    return json(res, 200, { ok: true })
  }

  if (req.method === 'POST' && url.pathname === '/pair/confirm') {
    const pairId = String(body?.pairId ?? '')
    if (!pairId) return bad(res, 'bad_request')
    const db = dbStore.readSync()
    const pair = db.pairs.find((p: any) => p.id === pairId)
    if (!pair) return bad(res, 'not_found', 404)
    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
    if (pair.userA === userId) pair.confirmA = true
    if (pair.userB === userId) pair.confirmB = true
    if (pair.userA && pair.userB && pair.confirmA && pair.confirmB) pair.status = 'active'
    pair.updatedAt = Date.now()
    await dbStore.write(db)
    return json(res, 200, { ok: true, status: pair.status })
  }

  if (req.method === 'POST' && url.pathname === '/pair/weekly-limit/propose') {
	    const pairId = String(body?.pairId ?? '')
	    const limit = Number(body?.limit)
	    if (!pairId || !Number.isFinite(limit) || limit < 0 || limit > 50) return bad(res, 'bad_request')
	    const db = dbStore.readSync()
	    const pair = db.pairs.find((p: any) => p.id === pairId)
	    if (!pair) return bad(res, 'not_found', 404)
	    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
	    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)
	    // Replace any existing pending proposal with a new one from this user.
	    pair.weeklyLimitPending = { id: newId(), proposedBy: userId, limit, createdAt: Date.now() }
	    pair.updatedAt = Date.now()
	    await dbStore.write(db)
	    return json(res, 200, { ok: true, weeklyLimit: pair.weeklyLimit, pending: pair.weeklyLimitPending })
	  }

	  if (req.method === 'POST' && url.pathname === '/pair/weekly-limit/respond') {
	    const pairId = String(body?.pairId ?? '')
	    const proposalId = String(body?.proposalId ?? '')
	    const action = String(body?.action ?? '')
	    if (!pairId || !proposalId || !['accept', 'reject', 'cancel'].includes(action)) return bad(res, 'bad_request')

	    const db = dbStore.readSync()
	    const pair = db.pairs.find((p: any) => p.id === pairId)
	    if (!pair) return bad(res, 'not_found', 404)
	    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
	    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)
	    if (!pair.weeklyLimitPending || pair.weeklyLimitPending.id !== proposalId) return bad(res, 'no_pending_proposal', 409)
	    const proposedByMe = pair.weeklyLimitPending.proposedBy === userId
	    if ((action === 'accept' || action === 'reject') && proposedByMe) return bad(res, 'cannot_respond_own_proposal', 403)
	    if (action === 'cancel' && !proposedByMe) return bad(res, 'forbidden', 403)

	    if (action === 'accept') {
	      pair.weeklyLimit = pair.weeklyLimitPending.limit
	    }
	    // reject/cancel both clear the pending proposal without changing current limit.
	    pair.weeklyLimitPending = null
	    pair.updatedAt = Date.now()
	    await dbStore.write(db)
	    return json(res, 200, { ok: true, weeklyLimit: pair.weeklyLimit })
	  }

	  const pairMatch = url.pathname.match(/^\/pair\/([A-Za-z0-9_-]+)$/)
	  if (req.method === 'GET' && pairMatch) {
	    const pairId = pairMatch[1]
	    const db = normalizeDb(dbStore.readSync())
	    const pair = db.pairs.find((p: any) => p.id === pairId)
	    if (!pair) return bad(res, 'not_found', 404)
	    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
	    const userA = db.users.find((u: any) => u.id === pair.userA)
	    const userB = pair.userB ? db.users.find((u: any) => u.id === pair.userB) : null
	    const now = Date.now()
	    const usage = { answeredThisWeek: answeredThisWeekForLimit(db, pair.id, userId, now), weeklyLimit: pair.weeklyLimit }
	    const partnerDeleted = isPartnerDeleted(db, pair, userId)
	    return json(res, 200, {
	      id: pair.id,
	      status: pair.status,
	      weeklyLimit: pair.weeklyLimit,
	      weeklyLimitPending: pair.weeklyLimitPending ?? null,
	      seededSystemQuestionsAt: pair.seededSystemQuestionsAt ?? null,
	      usage,
	      partnerDeleted,
	      confirmA: pair.confirmA,
	      confirmB: pair.confirmB,
	      userA: userA ? { id: userA.id, nickname: userA.nickname, code: userA.code, ecdhPublicRawB64: userA.ecdhPublicRawB64 } : null,
	      userB: userB ? { id: userB.id, nickname: userB.nickname, code: userB.code, ecdhPublicRawB64: userB.ecdhPublicRawB64 } : null,
	    })
	  }

  if (req.method === 'POST' && url.pathname === '/questions') {
    const pairId = String(body?.pairId ?? '')
    const blob = body?.blob as QuestionRecord['blob'] | undefined
    if (!pairId || !blob?.ciphertextB64 || !blob?.ivB64 || !blob?.aadB64) return bad(res, 'bad_request')
    const now = Date.now()
    const db = normalizeDb(dbStore.readSync())
    const pair = requirePairMember(db, pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    if (pair.status !== 'active') return bad(res, 'pair_not_active', 409)
    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)

    const q: QuestionRecord = { id: newId(), pairId, createdBy: userId, createdAt: now, blob: { ...blob, schemaVersion: 1 } }
    db.questions.push(q)
    await dbStore.write(db)
    return json(res, 200, q)
  }

  if (req.method === 'POST' && url.pathname === '/questions/delete') {
    const questionId = String(body?.questionId ?? '')
    if (!questionId) return bad(res, 'bad_request')

    const db = normalizeDb(dbStore.readSync())
    const question = db.questions.find((q: any) => q.id === questionId)
    if (!question) return bad(res, 'not_found', 404)
    const pair = requirePairMember(db, question.pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    if (question.createdBy !== userId) return bad(res, 'forbidden', 403)

    const partnerAnswered = db.answers.some((a: any) => a.questionId === questionId && a.userId !== userId)
    if (partnerAnswered) return bad(res, 'cannot_delete_after_partner_answer', 409)

    db.questions = db.questions.filter((q: any) => q.id !== questionId)
    db.answers = db.answers.filter((a: any) => a.questionId !== questionId)
    await dbStore.write(db)
    return json(res, 200, { ok: true })
  }

  const questionsMatch = url.pathname.match(/^\/questions\/([A-Za-z0-9_-]+)$/)
  if (req.method === 'GET' && questionsMatch) {
    const pairId = questionsMatch[1]
    const db = normalizeDb(dbStore.readSync())
    const pair = requirePairMember(db, pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)
    return json(res, 200, db.questions.filter((q: any) => q.pairId === pairId))
  }

  if (req.method === 'POST' && url.pathname === '/answers') {
    const questionId = String(body?.questionId ?? '')
    const blob = body?.blob as AnswerRecord['blob'] | undefined
    if (!questionId || !blob?.ciphertextB64 || !blob?.ivB64 || !blob?.aadB64) return bad(res, 'bad_request')
    const now = Date.now()
    const db = normalizeDb(dbStore.readSync())
    const question = db.questions.find((q: any) => q.id === questionId)
    if (!question) return bad(res, 'not_found', 404)
    const pair = requirePairMember(db, question.pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    if (pair.status !== 'active') return bad(res, 'pair_not_active', 409)
    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)

    const already = db.answers.find((a: any) => a.questionId === questionId && a.userId === userId)
    if (already) return bad(res, 'already_answered', 409)

    // Weekly limit applies to answering questions not created by you.
    // limit=0 means unlimited answers.
    if (question.createdBy !== userId) {
      if (pair.weeklyLimit > 0) {
        const answeredThisWeek = answeredThisWeekForLimit(db, pair.id, userId, now)
        if (answeredThisWeek >= pair.weeklyLimit) return bad(res, 'weekly_limit_reached', 429)
      }
    }

    const answer: AnswerRecord = { id: newId(), questionId, pairId: pair.id, userId, createdAt: now, blob: { ...blob, schemaVersion: 1 } }
    db.answers.push(answer)
    await dbStore.write(db)
    return json(res, 200, answer)
  }

  // Upsert answer: allows changing your answer without consuming weekly limit again.
  if (req.method === 'POST' && url.pathname === '/answers/upsert') {
    const questionId = String(body?.questionId ?? '')
    const blob = body?.blob as AnswerRecord['blob'] | undefined
    if (!questionId || !blob?.ciphertextB64 || !blob?.ivB64 || !blob?.aadB64) return bad(res, 'bad_request')
    const now = Date.now()
    const db = normalizeDb(dbStore.readSync())
    const question = db.questions.find((q: any) => q.id === questionId)
    if (!question) return bad(res, 'not_found', 404)
    const pair = requirePairMember(db, question.pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    if (pair.status !== 'active') return bad(res, 'pair_not_active', 409)
    if (isPartnerDeleted(db, pair, userId)) return bad(res, 'partner_deleted', 409)

    const existing = db.answers.find((a: any) => a.questionId === questionId && a.userId === userId)
    if (existing) {
      // Once the partner has answered, lock the answer (no further changes).
      const partnerAnswered = db.answers.some((a: any) => a.questionId === questionId && a.userId !== userId)
      if (partnerAnswered) return bad(res, 'cannot_update_after_partner_answer', 409)
      existing.blob = { ...blob, schemaVersion: 1 }
      existing.updatedAt = now
      await dbStore.write(db)
      return json(res, 200, { ok: true, updated: true })
    }

    // New answer: apply weekly limit rules (limit=0 means unlimited).
    if (question.createdBy !== userId) {
      if (pair.weeklyLimit > 0) {
        const answeredThisWeek = answeredThisWeekForLimit(db, pair.id, userId, now)
        if (answeredThisWeek >= pair.weeklyLimit) return bad(res, 'weekly_limit_reached', 429)
      }
    }

    const answer: AnswerRecord = { id: newId(), questionId, pairId: pair.id, userId, createdAt: now, blob: { ...blob, schemaVersion: 1 } }
    db.answers.push(answer)
    await dbStore.write(db)
    return json(res, 200, { ok: true, updated: false })
  }

  const answersMatch = url.pathname.match(/^\/answers\/([A-Za-z0-9_-]+)$/)
  if (req.method === 'GET' && answersMatch) {
    const questionId = answersMatch[1]
    const db = normalizeDb(dbStore.readSync())
    const question = db.questions.find((q: any) => q.id === questionId)
    if (!question) return bad(res, 'not_found', 404)
    const pair = requirePairMember(db, question.pairId, userId)
    if (!pair) return bad(res, 'forbidden', 403)
    return json(res, 200, db.answers.filter((a: any) => a.questionId === questionId))
  }

  const answersByPairMatch = url.pathname.match(/^\/answers\/by-pair\/([A-Za-z0-9_-]+)$/)
  if (req.method === 'GET' && answersByPairMatch) {
    const pairId = answersByPairMatch[1]
    const db = normalizeDb(dbStore.readSync())
    const pair = db.pairs.find((p: any) => p.id === pairId)
    if (!pair) return bad(res, 'not_found', 404)
    if (![pair.userA, pair.userB].includes(userId)) return bad(res, 'forbidden', 403)
    return json(res, 200, db.answers.filter((a: any) => a.pairId === pairId))
  }

  return bad(res, 'not_found', 404)
})

const port = Number(process.env.PORT ?? 3001)
server.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
