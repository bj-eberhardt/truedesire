import './App.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api/api'
import { decryptJson, encryptJson } from './crypto/aead'
import { derivePairAesKey } from './crypto/sharedKey'
import { sha256Base64 } from './crypto/sign'
import { exportBackup, importBackup, loadIdentity, resetIdentity, type Identity } from './state/identity'
import { idbGet, idbSet } from './storage/idb'
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from './types'

function ProfileAvatar({ name }: { name: string }) {
  return (
      <div className="avatar" aria-hidden="true" title={name}>
        <svg viewBox="0 0 48 48" className="avatar-svg" role="presentation">
          <circle cx="24" cy="24" r="22" className="avatar-bg" />
          <circle cx="24" cy="19" r="8" className="avatar-fg" />
          <path d="M10 40c2.8-7 9-11 14-11s11.2 4 14 11" className="avatar-fg" fill="none" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
  )
}

function RefreshButton({ onClick, disabled, title = 'Neu laden' }: { onClick: () => void | Promise<void>; disabled?: boolean; title?: string }) {
  return (
      <button className="secondary icon-btn" onClick={onClick} disabled={disabled} aria-label={title} title={title}>
        <span aria-hidden="true">↻</span>
      </button>
  )
}

function MatchVisibilityIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
        <svg viewBox="0 0 24 24" className="inline-icon" role="presentation" aria-hidden="true">
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M2.5 12s3.5-6 9.5-6a10.2 10.2 0 0 1 6.7 2.4M21.5 12s-3.5 6-9.5 6a10 10 0 0 1-4.5-1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    )
  }
  return (
      <svg viewBox="0 0 24 24" className="inline-icon" role="presentation" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
  )
}

function App() {
  const MIN_LOADING_MS = 1500
  const [uiVersion, setUiVersion] = useState<1 | 2>(1)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [nickname, setNickname] = useState('')
  const [pair, setPair] = useState<PairView | null>(null)
  const [partnerCodeInput, setPartnerCodeInput] = useState('')
  const [pairingIncoming, setPairingIncoming] = useState<Array<{ id: string; from: { id: string; code: string; nickname: string }; createdAt: number }>>([])
  const [pairingOutgoing, setPairingOutgoing] = useState<Array<{ id: string; to: { id: string; code: string; nickname: string }; createdAt: number }>>([])
  const [myPairs, setMyPairs] = useState<
      Array<{
        id: string
        status: 'pending' | 'active'
        weeklyLimit: number
        partnerDeleted: boolean
        partner: { id: string; nickname: string; code: string } | null
        updatedAt: number
      }>
  >([])
  const [questionText, setQuestionText] = useState('')
  const [questionSelfAnswer, setQuestionSelfAnswer] = useState<AnswerChoice | null>(null)
  const [questions, setQuestions] = useState<DecryptedQuestion[]>([])
  const [rawQuestions, setRawQuestions] = useState<QuestionView[]>([])
  const [matches, setMatches] = useState<Array<{ id: string; question: string; grade: 'perfect' | 'maybe' | 'ok'; answers: AnswerChoice[] }>>([])
  const [hiddenMatchIds, setHiddenMatchIds] = useState<string[]>([])
  const [showHiddenMatches, setShowHiddenMatches] = useState(false)
  const [answerSummary, setAnswerSummary] = useState<Record<string, { total: number; mine?: AnswerChoice }>>({})
  const [activeStep, setActiveStep] = useState<3 | 4 | 5>(3)
  const [weeklyLimitInput, setWeeklyLimitInput] = useState('15')
  const [v2AllowAllQuestions, setV2AllowAllQuestions] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [answerLimitReached, setAnswerLimitReached] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemQuestionHashes, setSystemQuestionHashes] = useState<Record<string, string>>({})
  const [v2PairId, setV2PairId] = useState<string | null>(null)
  const [v2Mode, setV2Mode] = useState<'home' | 'pair' | 'ask' | 'played'>('home')
  const [pairingInlineError, setPairingInlineError] = useState<string | null>(null)
  const [v2CardIndex, setV2CardIndex] = useState(0)
  const [v2AskError, setV2AskError] = useState<string | null>(null)
  const [v2OnboardPath, setV2OnboardPath] = useState<'start' | 'backup' | 'new'>('start')
  const [v2BackupText, setV2BackupText] = useState('')
  const [v2OnboardError, setV2OnboardError] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [isBootstrappingAccount, setIsBootstrappingAccount] = useState(true)
  const [isLoadingPairData, setIsLoadingPairData] = useState(false)
  const [isLoadingMatches, setIsLoadingMatches] = useState(false)
  const [isLoadingGroupSettings, setIsLoadingGroupSettings] = useState(false)
  const pollInFlightRef = useRef(false)
  const initialPreloadDoneRef = useRef(false)
  const playSectionRef = useRef<HTMLHeadingElement | null>(null)
  const matchesSectionRef = useRef<HTMLDivElement | null>(null)
  const groupSettingsSectionRef = useRef<HTMLHeadingElement | null>(null)

  function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 92
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  const hiddenMatchesStorageKey = pair?.id ? `ui:v2:hiddenMatches:${pair.id}` : null
  const visibleMatchesCount = matches.filter((m) => (showHiddenMatches ? hiddenMatchIds.includes(m.id) : !hiddenMatchIds.includes(m.id))).length

  useEffect(() => {
    if (!hiddenMatchesStorageKey) {
      setHiddenMatchIds([])
      return
    }
    ;(async () => {
      const stored = await idbGet<string[]>(hiddenMatchesStorageKey)
      setHiddenMatchIds(Array.isArray(stored) ? stored : [])
    })()
  }, [hiddenMatchesStorageKey])

  useEffect(() => {
    if (!hiddenMatchesStorageKey) return
        ;(async () => {
      await idbSet(hiddenMatchesStorageKey, hiddenMatchIds)
    })()
  }, [hiddenMatchesStorageKey, hiddenMatchIds])

  useEffect(() => {
    if (!showHiddenMatches) return
    const hiddenCount = matches.filter((m) => hiddenMatchIds.includes(m.id)).length
    if (hiddenCount === 0) setShowHiddenMatches(false)
  }, [showHiddenMatches, matches, hiddenMatchIds])

  function showSaved(message: string) {
    setSavedToast(message)
    window.setTimeout(() => setSavedToast(null), 1600)
  }

  const apiReady = !!identity?.userId
  const apiClient = useMemo(() => {
    if (!identity?.userId) return null
    return api({
      baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001',
      getAuthMaterial: async () => identity.auth,
    })
  }, [identity])

  useEffect(() => {
    ;(async () => {
      try {
        const savedVersion = await idbGet<number>('ui:version')
        if (savedVersion === 2) setUiVersion(2)
        const id = await loadIdentity()
        // If already registered, refresh profile from server to get the pairing code.
        const hydrated = id?.userId ? await loadIdentity({ ensureRegistered: true }) : id
        setIdentity(hydrated)
        setNickname(hydrated?.nickname ?? '')
        if (hydrated?.userId) {
          try {
            const client = api({
              baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001',
              getAuthMaterial: async () => hydrated.auth,
            })
            const reqs = await client.pairing.requests()
            setPairingIncoming(reqs.incoming)
            setPairingOutgoing(reqs.outgoing)
            const pairs = await client.pairs.list()
            setMyPairs(pairs.pairs)
          } catch {
            // ignore initial refresh errors
          }
        }
        const last = await idbGet<string>('ui:lastPairId')
        if (last) {
          try {
            const apiClient = hydrated?.userId
                ? api({ baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001', getAuthMaterial: async () => hydrated.auth })
                : null
            if (apiClient) {
              const p = await apiClient.pair.get(last)
              setPair(p)
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setIsBootstrappingAccount(false)
      }
    })()
  }, [])

  useEffect(() => {
    function parseHash() {
      const h = window.location.hash || '#/'
      const mPair = h.match(/^#\/pair\/([^/]+)$/)
      const mAsk = h.match(/^#\/pair\/([^/]+)\/ask$/)
      const mPlayed = h.match(/^#\/pair\/([^/]+)\/played$/)
      if (mAsk) {
        setV2PairId(decodeURIComponent(mAsk[1]))
        setV2Mode('ask')
        return
      }
      if (mPlayed) {
        setV2PairId(decodeURIComponent(mPlayed[1]))
        setV2Mode('played')
        return
      }
      if (mPair) {
        setV2PairId(decodeURIComponent(mPair[1]))
        setV2Mode('pair')
        return
      }
      setV2PairId(null)
      setV2Mode('home')
    }
    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [])

  function goV2Home() {
    window.location.hash = '#/'
  }

  function goV2Pair(pairId: string) {
    window.location.hash = `#/pair/${encodeURIComponent(pairId)}`
  }

  function goV2Ask(pairId: string) {
    setQuestionText('')
    setQuestionSelfAnswer(null)
    setV2AskError(null)
    window.location.hash = `#/pair/${encodeURIComponent(pairId)}/ask`
  }

  function goV2Played(pairId: string) {
    window.location.hash = `#/pair/${encodeURIComponent(pairId)}/played`
  }

  function nextWeeklyResetDateText(now = new Date()): string {
    // Next Monday 00:00 local time.
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay() // 0=Sun..6=Sat
    const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7
    d.setDate(d.getDate() + daysUntilMonday)
    return d.toLocaleDateString()
  }

  async function switchVersion(v: 1 | 2) {
    setUiVersion(v)
    await idbSet('ui:version', v)
  }

  useEffect(() => {
    if (!autoRefresh) return
    if (!apiClient) return
    const interval = window.setInterval(async () => {
      if (pollInFlightRef.current) return
      pollInFlightRef.current = true
      try {
        await refreshPairing()
      } catch {
        // ignore polling errors
      } finally {
        pollInFlightRef.current = false
      }
    }, 5000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, apiClient])

  async function refreshV2PairView() {
    await refreshPairing()
    const targetPairId = v2PairId ?? pair?.id
    if (!targetPairId) return
    try {
      await selectPair(targetPairId)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!apiClient) return
    if (initialPreloadDoneRef.current) return
    initialPreloadDoneRef.current = true
    ;(async () => {
      await refreshPairing()
      const routeTargetPairId =
          uiVersion === 2 && v2PairId && (v2Mode === 'pair' || v2Mode === 'ask' || v2Mode === 'played')
              ? v2PairId
              : null
      const last = await idbGet<string>('ui:lastPairId')
      const targetPairId = routeTargetPairId ?? last
      if (targetPairId) {
        await selectPair(targetPairId)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, uiVersion, v2PairId, v2Mode])

  async function register() {
    try {
      setError(null)
      const next = await loadIdentity({ nickname: nickname.trim() || 'Anon', ensureRegistered: true })
      if (!next) throw new Error('identity_not_available')
      setIdentity(next)
      setNickname(next.nickname)
      await refreshPairing(next)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  async function refreshPairing(idOverride?: Identity) {
    const id = idOverride ?? identity
    if (!id?.userId) return
    const client = apiClient ?? api({ baseUrl: import.meta.env.VITE_API_BASE ?? 'http://localhost:3001', getAuthMaterial: async () => id.auth })
    const reqs = await client.pairing.requests()
    setPairingIncoming(reqs.incoming)
    setPairingOutgoing(reqs.outgoing)
    const pairs = await client.pairs.list()
    setMyPairs(pairs.pairs)
  }

  async function selectPair(pairId: string) {
    if (!apiClient) return
    const startedAt = Date.now()
    setIsLoadingPairData(true)
    setError(null)
    try {
      const p = await apiClient.pair.get(pairId)
      setPair(p)
      setWeeklyLimitInput(String(p.weeklyLimit))
      setV2AllowAllQuestions((p.usage?.weeklyLimit ?? p.weeklyLimit) === 0)
      {
        const weeklyLimit = p.usage?.weeklyLimit ?? p.weeklyLimit
        const answeredThisWeek = p.usage?.answeredThisWeek ?? 0
        setAnswerLimitReached(weeklyLimit > 0 && answeredThisWeek >= weeklyLimit)
      }
      setMatches([])
      setQuestions([])
      setRawQuestions([])
      setAnswerSummary({})
      await idbSet('ui:lastPairId', pairId)
      await refreshPairing()
      // Load hashes for verification labeling.
      try {
        const system = await apiClient.system.questions()
        setSystemQuestionHashes(Object.fromEntries(system.questions.map((q) => [q.id, q.sha256B64])))
      } catch {
        setSystemQuestionHashes({})
      }
      await ensureSystemQuestionsSeeded(p)
      await loadQuestionsAndDecrypt(p)
      await computeMatches(p)
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS - elapsed))
      }
      setIsLoadingPairData(false)
    }
  }

  async function ensureSystemQuestionsSeeded(p: PairView) {
    if (!apiClient || !identity?.userId) return
    if (p.status !== 'active' || !p.partner) return
    try {
      // Server ensures this is executed at most once per pair (idempotent).
      if (p.seededSystemQuestionsAt) return
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, p, identity.userId)
      const system = await apiClient.system.questions()
      setSystemQuestionHashes(Object.fromEntries(system.questions.map((q) => [q.id, q.sha256B64])))
      const items = await Promise.all(
          system.questions.map(async (q) => ({
            systemId: q.id,
            blob: await encryptJson(
                aes,
                { text: q.text, systemId: q.id, systemHash: q.sha256B64 },
                `love-interests|pair:${p.id}|question|system:${q.id}`,
            ),
          })),
      )
      await apiClient.pairs.seedSystemQuestions(p.id, items)
    } catch {
      // ignore seeding errors
    }
  }

  async function sendPairRequest() {
    if (!apiClient) return
    setError(null)
    setPairingInlineError(null)
    const partnerCode = partnerCodeInput.trim().toUpperCase()
    if (!partnerCode) return
    try {
      await apiClient.pairing.request(partnerCode)
      setPartnerCodeInput('')
      await refreshPairing()
    } catch (e: any) {
      const msg = e?.message ?? String(e)
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
      setError(msg)
    }
  }

  async function respond(requestId: string, action: 'accept' | 'reject' | 'cancel') {
    if (!apiClient) return
    setError(null)
    await apiClient.pairing.respond(requestId, action)
    await refreshPairing()
  }

  async function proposeWeeklyLimit() {
    if (!apiClient || !pair) return
    const limit = Number(weeklyLimitInput)
    if (!Number.isFinite(limit)) return
    await apiClient.pair.proposeWeeklyLimit(pair.id, limit)
    await selectPair(pair.id)
  }

  async function proposeV2GroupSettings() {
    if (!apiClient || !pair) return
    const limit = v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)
    if (!Number.isFinite(limit) || limit < 0 || limit > 50) return
    const currentLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
    if (limit === currentLimit) return
    await apiClient.pair.proposeWeeklyLimit(pair.id, limit)
    await refreshGroupSettingsPanel()
  }

  async function respondWeeklyLimit(action: 'accept' | 'reject' | 'cancel') {
    if (!apiClient || !pair?.weeklyLimitPending) return
    await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action)
    await selectPair(pair.id)
  }

  async function respondV2GroupSettings(action: 'accept' | 'reject' | 'cancel') {
    if (!apiClient || !pair?.weeklyLimitPending) return
    await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action)
    await refreshGroupSettingsPanel()
  }

  async function refreshGroupSettingsPanel() {
    if (!pair?.id) return
    const startedAt = Date.now()
    setIsLoadingGroupSettings(true)
    try {
      await refreshCurrentPair()
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS - elapsed))
      }
      setIsLoadingGroupSettings(false)
    }
  }

  async function loadQuestionsAndDecrypt(pOverride?: PairView) {
    const p = pOverride ?? pair
    if (!apiClient || !p || !identity || !identity.userId) return
    setError(null)
    try {
      const list = await apiClient.questions.list(p.id)
      setRawQuestions(list)

      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, p, identity.userId)
      const decoded: DecryptedQuestion[] = []
      for (const q of list) {
        try {
          const payload = await decryptJson<any>(aes, q.blob)
          const text = typeof payload?.text === 'string' ? payload.text : '[?]'
          let textSuffix = ''
          if (payload?.systemId && payload?.systemHash) {
            const expected = systemQuestionHashes[String(payload.systemId)]
            const actual = await sha256Base64(text)
            const ok = expected && expected === String(payload.systemHash) && expected === actual
            textSuffix = ok ? '' : ' (nicht verifiziert)'
          }
          decoded.push({ ...q, text: text + textSuffix })
        } catch {
          decoded.push({ ...q, text: '[Entschlüsselung fehlgeschlagen]' })
        }
      }
      setQuestions(decoded.sort((a, b) => b.createdAt - a.createdAt))

      // Answer summary for step 4 (no partner answer reveal; only counts + your choice).
      const allAnswers = await apiClient.answers.listByPair(p.id)
      const answersByQuestion: Record<string, typeof allAnswers> = {}
      for (const a of allAnswers) {
        ;(answersByQuestion[a.questionId] ??= []).push(a)
      }
      const summary: Record<string, { total: number; mine?: AnswerChoice }> = {}
      for (const q of list) {
        const answers = answersByQuestion[q.id] ?? []
        const total = answers.length
        let mine: AnswerChoice | undefined
        for (const a of answers) {
          if (a.userId !== identity.userId) continue
          try {
            const payload = await decryptJson<{ answer: AnswerChoice }>(aes, a.blob)
            mine = payload.answer
          } catch {
            // ignore
          }
        }
        summary[q.id] = { total, mine }
      }
      setAnswerSummary(summary)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  function isPartnerAnswered(questionId: string): boolean {
    const s = answerSummary[questionId]
    if (!s) return false
    if (s.total >= 2) return true
    if (s.total === 1 && !s.mine) return true
    return false
  }

  async function deleteQuestion(questionId: string) {
    if (!apiClient || !pair) return
    setError(null)
    if (!confirm('Frage wirklich löschen? (nur möglich, solange dein Partner noch nicht geantwortet hat)')) return
    try {
      await apiClient.questions.delete(questionId)
      await loadQuestionsAndDecrypt()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  async function refreshCurrentPair() {
    if (!apiClient || !pair) return
    try {
      const p = await apiClient.pair.get(pair.id)
      setPair(p)
      setWeeklyLimitInput(String(p.weeklyLimit))
      setV2AllowAllQuestions((p.usage?.weeklyLimit ?? p.weeklyLimit) === 0)
      {
        const weeklyLimit = p.usage?.weeklyLimit ?? p.weeklyLimit
        const answeredThisWeek = p.usage?.answeredThisWeek ?? 0
        setAnswerLimitReached(weeklyLimit > 0 && answeredThisWeek >= weeklyLimit)
      }
    } catch {
      // ignore
    }
  }

  async function addQuestion() {
    if (!apiClient || !pair || !identity) return
    setError(null)
    const text = questionText.trim()
    if (!text) return
    if (!questionSelfAnswer) {
      setError('Bitte wähle Ja/Vielleicht/Nein für deine eigene Antwort aus.')
      return
    }
    try {
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, pair, identity.userId!)
      const blob = await encryptJson(aes, { text }, `love-interests|pair:${pair.id}|question`)
      const created = await apiClient.questions.create(pair.id, blob)

      // Immediately store your own answer to reduce feedback loop.
      try {
        const answerBlob = await encryptJson(
            aes,
            { answer: questionSelfAnswer },
            `love-interests|pair:${pair.id}|answer|q:${created.id}`,
        )
        await apiClient.answers.create(created.id, answerBlob)
      } catch (e: any) {
        const msg = e?.message ?? String(e)
        if (msg === 'weekly_limit_reached') {
          setError('Frage erstellt, aber Wochenlimit fürs Antworten erreicht (deine Antwort wurde nicht gespeichert).')
        } else if (msg === 'already_answered') {
          // ignore
        } else {
          setError(`Frage erstellt, aber Antwort konnte nicht gespeichert werden: ${msg}`)
        }
      }

      setQuestionText('')
      setQuestionSelfAnswer(null)
      await refreshCurrentPair()
      await loadQuestionsAndDecrypt()
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      if (msg === 'weekly_limit_reached') {
        setError('Wochenlimit gilt nur fürs Antworten. Bitte Server neu starten, falls du diese Meldung beim Fragenstellen siehst.')
      } else {
        setError(msg)
      }
    }
  }

  async function answer(questionId: string, choice: AnswerChoice) {
    if (!apiClient || !pair || !identity) return
    setError(null)
    try {
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, pair, identity.userId!)
      const blob = await encryptJson(aes, { answer: choice }, `love-interests|pair:${pair.id}|answer|q:${questionId}`)
      // Use upsert so the user can change their mind without hitting "already answered",
      // and without consuming weekly limit again.
      await apiClient.answers.upsert(questionId, blob)
      setAnswerLimitReached(false)
      await refreshCurrentPair()
      await loadQuestionsAndDecrypt()
      showSaved('Antwort gespeichert')
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      if (msg === 'weekly_limit_reached') {
        setAnswerLimitReached(true)
        setError('Wochenlimit fürs Antworten erreicht. Du kannst diese Woche keine weiteren Antworten abgeben.')
      } else if (msg === 'cannot_update_after_partner_answer') {
        setError('Dein Partner hat bereits geantwortet. Deine Antwort ist jetzt gesperrt und kann nicht mehr geändert werden.')
        try {
          await refreshCurrentPair()
          await loadQuestionsAndDecrypt()
        } catch {
          // ignore
        }
      } else {
        setError(msg)
      }
    }
  }

  async function computeMatches(pairOverride?: PairView) {
    const currentPair = pairOverride ?? pair
    if (!apiClient || !currentPair || !identity) return
    const startedAt = Date.now()
    setIsLoadingMatches(true)
    setError(null)
    try {
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, currentPair, identity.userId!)
      const next: Array<{ id: string; question: string; grade: 'perfect' | 'maybe' | 'ok'; answers: AnswerChoice[]; createdAt: number }> = []
      const allAnswers = await apiClient.answers.listByPair(currentPair.id)
      const answersByQuestion: Record<string, typeof allAnswers> = {}
      for (const a of allAnswers) {
        ;(answersByQuestion[a.questionId] ??= []).push(a)
      }
      const questionSource = rawQuestions.length ? rawQuestions : await apiClient.questions.list(currentPair.id)
      for (const q of questionSource) {
        const answers = answersByQuestion[q.id] ?? []
        const decoded: AnswerChoice[] = []
        for (const a of answers) {
          try {
            const payload = await decryptJson<{ answer: AnswerChoice }>(aes, a.blob)
            decoded.push(payload.answer)
          } catch {
            decoded.push('maybe')
          }
        }
        if (decoded.length < 2) continue
        if (!decoded.includes('no')) {
          let questionText = questions.find((x) => x.id === q.id)?.text
          if (!questionText) {
            try {
              const payload = await decryptJson<any>(aes, q.blob)
              questionText = typeof payload?.text === 'string' ? payload.text : '[?]'
            } catch {
              questionText = '[?]'
            }
          }
          let grade: 'perfect' | 'maybe' | 'ok' = 'ok'
          if (decoded.every((x) => x === 'yes')) grade = 'perfect'
          else if (decoded.some((x) => x === 'maybe')) grade = 'maybe'
          next.push({ id: q.id, question: questionText ?? '[?]', answers: decoded, grade, createdAt: q.createdAt })
        }
      }
      next.sort((a, b) => b.createdAt - a.createdAt)
      setMatches(next.map(({ createdAt: _createdAt, ...rest }) => rest))
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS - elapsed))
      }
      setIsLoadingMatches(false)
    }
  }

  async function doExportBackup() {
    const txt = await exportBackup()
    await navigator.clipboard.writeText(txt)
    alert('Backup (JSON) wurde in die Zwischenablage kopiert.')
  }

  async function doImportBackup() {
    const txt = prompt('Backup JSON einfügen:')
    if (!txt) return
    await importBackup(txt)
    const id = await loadIdentity()
    setIdentity(id)
    setNickname(id?.nickname ?? '')
    alert('Import abgeschlossen.')
  }

  async function importBackupFromTextarea() {
    const txt = v2BackupText.trim()
    if (!txt) {
      setV2OnboardError('Bitte füge dein Backup-JSON ein.')
      return
    }
    try {
      JSON.parse(txt)
    } catch {
      setV2OnboardError('Ungültiges JSON. Bitte vollständiges Backup einfügen.')
      return
    }
    try {
      setV2OnboardError(null)
      await importBackup(txt)
      const id = await loadIdentity()
      setIdentity(id)
      setNickname(id?.nickname ?? '')
      setV2BackupText('')
      setV2OnboardPath('start')
      alert('Backup importiert und Konto geladen.')
    } catch (e: any) {
      setV2OnboardError(e?.message ?? String(e))
    }
  }

  async function openPairInV2(pairId: string) {
    await selectPair(pairId)
    setActiveStep(4)
    setV2CardIndex(0)
  }

  useEffect(() => {
    if (uiVersion !== 2) return
    if (!apiClient) return
    if (!v2PairId) return
    if (v2Mode !== 'pair' && v2Mode !== 'ask' && v2Mode !== 'played') return
    if (pair?.id === v2PairId) return
        ;(async () => {
      try {
        await openPairInV2(v2PairId)
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiVersion, v2Mode, v2PairId, pair?.id, apiClient])

  useEffect(() => {
    if (!pair?.id) return
    const ordered = questions
        .slice()
        .sort((a, b) => {
          const am = answerSummary[a.id]?.mine ? 1 : 0
          const bm = answerSummary[b.id]?.mine ? 1 : 0
          if (am !== bm) return am - bm
          return b.createdAt - a.createdAt
        })
    const firstUnanswered = ordered.findIndex((q) => !answerSummary[q.id]?.mine)
    setV2CardIndex(Math.max(0, firstUnanswered >= 0 ? firstUnanswered : 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.id, questions.length])

  const header = (
      <header className="topbar">
        <div className="brand">
          <div className="logo">LI</div>
          <div>
            <div className="title">love.interests</div>
            <div className="subtitle">E2E Fragen-Spiel für Paare</div>
          </div>
        </div>
        <div className="top-actions">
          <div className="version-toggle" role="group" aria-label="UI version">
            <button type="button" className={uiVersion === 1 ? 'active' : ''} onClick={() => switchVersion(1)}>
              Version 1
            </button>
            <button type="button" className={uiVersion === 2 ? 'active' : ''} onClick={() => switchVersion(2)}>
              Version 2
            </button>
          </div>
          <button className="secondary" onClick={doExportBackup}>
            Backup kopieren
          </button>
          <button className="secondary" onClick={doImportBackup}>
            Backup importieren
          </button>
        </div>
      </header>
  )

  const version1 = (
      <main className="grid">
        <section className="card">
          <h2>1) Account</h2>
          <p className="hint">
            Ohne E-Mail/Passwort. Dein Gerät hält die privaten Schlüssel. Backup
            ist wichtig.
          </p>
          <label className="field">
            <span>Nickname</span>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </label>
          <div className="row">
            <button onClick={register}>Account erstellen / laden</button>
            <span className="mono">
              {identity?.userId ? `userId: ${identity.userId}` : 'nicht registriert'}
            </span>
          </div>
          {identity?.code ? (
              <div className="code-box">
                <div className="pair-label">Dein Pairing-Code</div>
                <div className="pair-code">{identity.code}</div>
                <div className="row">
                  <button
                      className="secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(identity.code!)
                        alert('Pairing-Code kopiert.')
                      }}
                  >
                    Kopieren
                  </button>
                </div>
                <p className="hint">
                  Gib diesen Code an den Partner. Fürs Pairing: beide geben den Code des anderen ein und akzeptieren dann.
                </p>
              </div>
          ) : null}
        </section>

        <section className="card">
          <h2>2) Pairing</h2>
          <p className="hint">
            Multi-Pairing ist erlaubt. Sende eine Anfrage mit dem Code des Partners. Eingehende Anfragen kannst du annehmen oder ablehnen.
          </p>
          <div className="row">
            <input
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                placeholder="Partner-Code (z.B. K7M2P9QX)"
                disabled={!apiReady}
            />
            <button onClick={sendPairRequest} disabled={!apiReady}>
              Anfrage senden
            </button>
            <button className="secondary" onClick={() => refreshPairing()} disabled={!apiReady}>
              Aktualisieren
            </button>
          </div>

          <div className="divider" />
          <div className="two-col">
            <div>
              <div className="pair-label">Eingehende Anfragen</div>
              <div className="request-list">
                {pairingIncoming.map((r) => (
                    <div className="request" key={r.id}>
                      <div className="row">
                        <div className="mono">{r.from.nickname}</div>
                        <div className="pill mono">{r.from.code}</div>
                      </div>
                      <div className="row">
                        <button onClick={() => respond(r.id, 'accept')} disabled={!apiReady}>
                          Annehmen
                        </button>
                        <button className="secondary" onClick={() => respond(r.id, 'reject')} disabled={!apiReady}>
                          Ablehnen
                        </button>
                      </div>
                    </div>
                ))}
                {!pairingIncoming.length ? <div className="empty">Keine.</div> : null}
              </div>
            </div>
            <div>
              <div className="pair-label">Ausgehende Anfragen</div>
              <div className="request-list">
                {pairingOutgoing.map((r) => (
                    <div className="request" key={r.id}>
                      <div className="row">
                        <div className="mono">{r.to.nickname}</div>
                        <div className="pill mono">{r.to.code}</div>
                      </div>
                      <div className="row">
                        <button className="secondary" onClick={() => respond(r.id, 'cancel')} disabled={!apiReady}>
                          Zurückziehen
                        </button>
                      </div>
                    </div>
                ))}
                {!pairingOutgoing.length ? <div className="empty">Keine.</div> : null}
              </div>
            </div>
          </div>

          <div className="divider" />
          <div className="pair-label">Deine Paare</div>
          <div className="pair-list">
            {myPairs.map((p) => (
                <button
                    key={p.id}
                    className={`pair-item secondary ${pair?.id === p.id ? 'active' : ''}`}
                    onClick={() => selectPair(p.id)}
                    disabled={!apiReady}
                    title="Pair auswählen"
                >
                  <div className="row">
                    <div className="mono">{p.partner ? p.partner.nickname : '—'}</div>
                    <div className="pill mono">{p.status}</div>
                    {p.partner?.code ? <div className="pill mono">{p.partner.code}</div> : null}
                  </div>
                </button>
            ))}
            {!myPairs.length ? <div className="empty">Noch keine Paare.</div> : null}
          </div>

          {pair?.id ? (
              <div className="pair-box">
                <div className="row">
                  <div>
                    <div className="pair-label">Pair-ID</div>
                    <div className="pair-id mono">{pair.id}</div>
                  </div>
                  <div className="pill">{pair.status}</div>
                </div>
                <div className="two-col">
                  <div>
                    <div className="pair-label">Du</div>
                    <div className="mono">{pair.me.nickname}</div>
                  </div>
                  <div>
                    <div className="pair-label">Partner</div>
                    <div className="mono">{pair.partner ? pair.partner.nickname : '—'}</div>
                  </div>
                </div>

                <div className="divider" />
                <div className="row">
                  <label className="field inline">
                    <span>Wochenlimit</span>
                    <input value={weeklyLimitInput} onChange={(e) => setWeeklyLimitInput(e.target.value)} />
                  </label>
                  <button className="secondary" onClick={proposeWeeklyLimit} disabled={!apiReady}>
                    Vorschlagen
                  </button>
                  {pair.weeklyLimitPending ? (
                      pair.weeklyLimitPending.proposedBy === identity?.userId ? (
                          <span className="hint">
                      Vorschlag offen: {pair.weeklyLimitPending.limit} (wartet auf Partner)
                    </span>
                      ) : (
                          <div className="row">
                            <span className="hint">Partner schlägt {pair.weeklyLimitPending.limit} vor.</span>
                            <button onClick={() => respondWeeklyLimit('accept')} disabled={!apiReady}>
                              Annehmen
                            </button>
                            <button className="secondary" onClick={() => respondWeeklyLimit('reject')} disabled={!apiReady}>
                              Ablehnen
                            </button>
                          </div>
                      )
                  ) : null}
                  <button
                      className="secondary"
                      onClick={async () => {
                        if (!confirm('Pair wirklich lösen?')) return
                        if (!apiClient) return
                        await apiClient.pairs.unpair(pair.id)
                        setPair(null)
                        await idbSet('ui:lastPairId', '')
                        await refreshPairing()
                      }}
                      disabled={!apiReady}
                  >
                    Pair lösen
                  </button>
                </div>
                <p className="hint">
                  Aktiv, sobald beide Partner denselben Wert vorschlagen.
                </p>
              </div>
          ) : null}
        </section>

        <section className="card wide">
          <h2>3) Fragen (verschlüsselt)</h2>
          <p className="hint">
            Der Server speichert nur Ciphertext. Entschlüsselung passiert nur
            bei dir und deinem Partner.
          </p>
          <div className="step-tabs">
            <button className={`tab ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(3)}>
              3) Fragen
            </button>
            <button className={`tab ${activeStep === 4 ? 'active' : ''}`} onClick={() => setActiveStep(4)} disabled={!pair || pair.status !== 'active'}>
              4) Spielen
            </button>
            <button className={`tab ${activeStep === 5 ? 'active' : ''}`} onClick={() => setActiveStep(5)} disabled={!pair || pair.status !== 'active'}>
              5) Auswertung
            </button>
          </div>

          <div className="row">
            <label className="toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              <span>Auto-Refresh</span>
            </label>
            <span className="hint">lädt nur Pairing-Status alle 5s neu (keine Fragen/Antworten)</span>
          </div>

          {activeStep === 3 ? (
              <>
                <div className="row">
                  <input
                      className="grow"
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Neue Frage hinzufügen…"
                      disabled={!pair || pair.status !== 'active'}
                  />
                  <div className="segmented">
                    <button
                        type="button"
                        className={`seg ${questionSelfAnswer === 'yes' ? 'active' : ''}`}
                        onClick={() => setQuestionSelfAnswer('yes')}
                        disabled={!pair || pair.status !== 'active'}
                        title="Deine Antwort: Ja"
                    >
                      Ja
                    </button>
                    <button
                        type="button"
                        className={`seg ${questionSelfAnswer === 'maybe' ? 'active' : ''}`}
                        onClick={() => setQuestionSelfAnswer('maybe')}
                        disabled={!pair || pair.status !== 'active'}
                        title="Deine Antwort: Vielleicht"
                    >
                      Vielleicht
                    </button>
                    <button
                        type="button"
                        className={`seg ${questionSelfAnswer === 'no' ? 'active' : ''}`}
                        onClick={() => setQuestionSelfAnswer('no')}
                        disabled={!pair || pair.status !== 'active'}
                        title="Deine Antwort: Nein"
                    >
                      Nein
                    </button>
                  </div>
                  <button onClick={addQuestion} disabled={!pair || pair.status !== 'active' || !questionText.trim() || !questionSelfAnswer}>
                    Frage stellen
                  </button>
                  <button className="secondary" onClick={() => loadQuestionsAndDecrypt()} disabled={!pair}>
                    Aktualisieren
                  </button>
                </div>

                <div className="question-list">
                  {questions
                      .slice()
                      .filter((q) => q.createdBy === identity?.userId)
                      .sort((a, b) => {
                        const am = answerSummary[a.id]?.mine ? 1 : 0
                        const bm = answerSummary[b.id]?.mine ? 1 : 0
                        if (am !== bm) return am - bm
                        return b.createdAt - a.createdAt
                      })
                      .map((q) => (
                          <div className={`question ${answerSummary[q.id]?.mine ? 'answered' : ''}`} key={q.id}>
                            <div className="q-meta">
                              <span className="mono">{new Date(q.createdAt).toLocaleString()}</span>
                              <span className="mono">von dir</span>
                            </div>
                            <div className="q-text">{q.text}</div>
                            <div className="row">
                              <div className="hint mono grow">
                                Antworten: {answerSummary[q.id]?.total ?? 0}/2 {answerSummary[q.id]?.mine ? `• du: ${answerSummary[q.id]?.mine}` : ''}
                              </div>
                              {q.createdBy === identity?.userId && !isPartnerAnswered(q.id) ? (
                                  <button className="secondary" onClick={() => deleteQuestion(q.id)}>
                                    Löschen
                                  </button>
                              ) : null}
                            </div>
                          </div>
                      ))}
                  {pair && questions.filter((q) => q.createdBy === identity?.userId).length === 0 ? (
                      <div className="empty">Du hast noch keine eigenen Fragen gestellt.</div>
                  ) : null}
                </div>
              </>
          ) : null}

          {activeStep === 4 ? (
              <>
                <div className="row">
                  <button className="secondary" onClick={() => loadQuestionsAndDecrypt()} disabled={!pair}>
                    Aktualisieren
                  </button>
                  <span className="hint">Du siehst nur deinen eigenen Antwort-Status. Partner-Antworten werden nicht angezeigt.</span>
                </div>
                {answerLimitReached ? (
                    <div className="notice">
                      Wochenlimit fürs Antworten erreicht. Du kannst weiterhin deine eigenen Fragen beantworten, aber keine weiteren Partner-Fragen diese Woche.
                    </div>
                ) : null}
                <div className="question-list">
                  {questions
                      .slice()
                      .sort((a, b) => {
                        const am = answerSummary[a.id]?.mine ? 1 : 0
                        const bm = answerSummary[b.id]?.mine ? 1 : 0
                        if (am !== bm) return am - bm
                        return b.createdAt - a.createdAt
                      })
                      .map((q) => {
                        const mine = answerSummary[q.id]?.mine
                        const answered = !!mine
                        const canAnswer = !answered && (!answerLimitReached || q.createdBy === identity?.userId)
                        return (
                            <div className={`question ${answered ? 'answered' : ''}`} key={q.id}>
                              <div className="q-meta">
                                <span className="mono">{new Date(q.createdAt).toLocaleString()}</span>
                                <span className="mono">
                          Antworten: {answerSummary[q.id]?.total ?? 0}/2 {answered ? `• du: ${mine}` : '• du: —'}
                        </span>
                              </div>
                              <div className="q-text">{q.text}</div>
                              <div className="row">
                                <button className="choice" onClick={() => answer(q.id, 'yes')} disabled={!pair || pair.status !== 'active' || !canAnswer}>
                                  Ja
                                </button>
                                <button className="choice secondary" onClick={() => answer(q.id, 'maybe')} disabled={!pair || pair.status !== 'active' || !canAnswer}>
                                  Vielleicht
                                </button>
                                <button className="choice danger" onClick={() => answer(q.id, 'no')} disabled={!pair || pair.status !== 'active' || !canAnswer}>
                                  Nein
                                </button>
                                {q.createdBy === identity?.userId && !isPartnerAnswered(q.id) ? (
                                    <button className="secondary" onClick={() => deleteQuestion(q.id)} disabled={!pair || pair.status !== 'active'}>
                                      Löschen
                                    </button>
                                ) : null}
                              </div>
                            </div>
                        )
                      })}
                  {pair && questions.length === 0 ? <div className="empty">Noch keine Fragen.</div> : null}
                </div>
              </>
          ) : null}

          {activeStep === 5 ? (
              <>
                <div className="divider" />
                <div className="row">
                  <button className="secondary" onClick={() => computeMatches()} disabled={!pair}>
                    Matches auswerten
                  </button>
                  <span className="hint">Es werden nur Fragen angezeigt, bei denen niemand „Nein“ gesagt hat.</span>
                </div>
                {matches.length ? (
                    <div className="match-grid">
                      {matches.map((m, idx) => (
                          <div className={`match-card ${m.grade}`} key={`${m.question}-${idx}`}>
                            <div className="match-head">
                              <div className="match-title">{m.question}</div>
                              <div className={`badge ${m.grade}`}>
                                {m.grade === 'perfect' ? '💜 Perfekt' : m.grade === 'maybe' ? '🟣 Vielleicht' : '⚪ Okay'}
                              </div>
                            </div>
                            <div className="match-answers">
                              {m.answers.map((a, i) => (
                                  <span className={`answer-pill ${a}`} key={i}>
                            {a === 'yes' ? 'Ja' : a === 'maybe' ? 'Vielleicht' : 'Nein'}
                          </span>
                              ))}
                            </div>
                          </div>
                      ))}
                    </div>
                ) : pair ? (
                    <div className="empty">Noch keine Matches (oder noch nicht beide geantwortet).</div>
                ) : null}
              </>
          ) : null}
        </section>

        {error ? (
            <section className="card error">
              <h2>Fehler</h2>
              <pre className="pre">{error}</pre>
            </section>
        ) : null}
      </main>
  )

  const version2 = (
      <main className="v2">
        {isBootstrappingAccount ? (
            <section className="card v2-loading">
              <h2>Konto wird geladen…</h2>
              <p className="hint">Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.</p>
            </section>
        ) : !identity?.userId ? (
            <>
              <div className="v2-top">
                <section className="card v2-view">
                  <h2>Willkommen</h2>
                  {v2OnboardPath === 'start' ? (
                      <>
                        <p className="hint v2-onboard-help">
                          Start-Check: Hast du bereits ein Backup von deinem Konto?
                        </p>
                        <div className="row">
                          <button
                              onClick={() => {
                                setV2OnboardError(null)
                                setV2OnboardPath('backup')
                              }}
                          >
                            Ja, ich habe ein Backup
                          </button>
                          <button
                              className="secondary"
                              onClick={() => {
                                setV2OnboardError(null)
                                setV2OnboardPath('new')
                              }}
                          >
                            Nein, neues Konto
                          </button>
                        </div>
                        <p className="hint">
                          Hinweis: Fragen/Antworten sind Ende-zu-Ende verschlüsselt. Ohne Backup sind alte Daten nicht wiederherstellbar.
                        </p>
                      </>
                  ) : null}
                  {v2OnboardPath === 'backup' ? (
                      <>
                        <p className="hint v2-onboard-help">
                          Füge dein Backup-JSON ein und importiere es. Danach wird dein Konto automatisch geladen.
                        </p>
                        <label className="field">
                          <span>Backup JSON</span>
                          <textarea
                              value={v2BackupText}
                              onChange={(e) => setV2BackupText(e.target.value)}
                              placeholder='{"version": ...}'
                              rows={8}
                          />
                        </label>
                        <div className="row">
                          <button onClick={importBackupFromTextarea}>Importieren und prüfen</button>
                          <button
                              className="secondary"
                              onClick={() => {
                                setV2OnboardError(null)
                                setV2OnboardPath('start')
                              }}
                          >
                            Zurück
                          </button>
                        </div>
                        <p className="hint">Tipp: Vollständiges JSON einfügen, nicht gekürzt.</p>
                      </>
                  ) : null}
                  {v2OnboardPath === 'new' ? (
                      <>
                        <p className="hint v2-onboard-help">
                          Erstelle ein neues Konto. Dein Nickname ist für Partner sichtbar, die deinen Code kennen.
                        </p>
                        <label className="field">
                          <span>Nickname</span>
                          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="z.B. Alex" />
                        </label>
                        <div className="row">
                          <button onClick={register}>Konto erstellen</button>
                          <button
                              className="secondary"
                              onClick={() => {
                                setV2OnboardError(null)
                                setV2OnboardPath('start')
                              }}
                          >
                            Zurück
                          </button>
                        </div>
                        <p className="hint">Du kannst danach jederzeit ein Backup exportieren und auf anderen Geräten importieren.</p>
                      </>
                  ) : null}
                  {v2OnboardError ? <div className="inline-error">{v2OnboardError}</div> : null}
                </section>
              </div>
            </>
        ) : (
            <>
              <div className="v2-shell">
                <div className="v2-topbar">
                  {v2Mode === 'home' ? (
                      <div className="profile v2-profile">
                        <div className="profile-head">
                          <ProfileAvatar name={identity.nickname} />
                          <div>
                            <div className="profile-name">{identity.nickname}</div>
                            <div className="hint">Dein Pairing-Code (teilen):</div>
                          </div>
                        </div>
                        <div className="profile-code">{identity.code ?? '—'}</div>
                        <div className="row">
                          <button
                              className="secondary"
                              onClick={async () => {
                                if (!identity.code) return
                                await navigator.clipboard.writeText(identity.code)
                                alert('Pairing-Code kopiert.')
                              }}
                          >
                            Kopieren
                          </button>
                          <RefreshButton onClick={() => refreshPairing()} title="Pairing-Status neu laden" />
                          <button
                              className="secondary danger"
                              onClick={async () => {
                                if (!apiClient) return
                                setError(null)
                                if (!confirm('Account wirklich löschen? Dein Partner sieht dich dann als gelöscht und Interaktion ist nicht mehr möglich.')) return
                                if (!confirm('Sicher? Ohne Backup sind alte Daten nicht wiederherstellbar.')) return
                                try {
                                  await apiClient.auth.deleteMe()
                                } catch {
                                  // even if server delete fails, allow local delete
                                }
                                await resetIdentity()
                                await idbSet('ui:lastPairId', '')
                                setPair(null)
                                setMyPairs([])
                                setPairingIncoming([])
                                setPairingOutgoing([])
                                setIdentity(null)
                                goV2Home()
                                alert('Account lokal gelöscht.')
                              }}
                          >
                            Account löschen
                          </button>
                        </div>
                        <div className="hint">
                          Hinweis: Beide Partner müssen gegenseitig den Code eingeben und die Anfrage jeweils <b>annehmen</b>, damit eine Verknüpfung aktiv wird.
                        </div>
                      </div>
                  ) : null}

                </div>

                {v2Mode === 'pair' && v2PairId ? (
                    <section className="card v2-detail">
                      <div className="row">
                        <button className="secondary" onClick={goV2Home} title="Zurück zur Partnerübersicht">
                          ← Zurück
                        </button>
                        <RefreshButton onClick={refreshV2PairView} disabled={!pair || pair.id !== v2PairId} title="Ansicht neu laden" />
                        <button
                            className="primary"
                            title="Eine eigene Frage stellen, die der Partner dann mitbeantworten kann"
                            onClick={() => goV2Ask(v2PairId)}
                            disabled={!pair || pair.status !== 'active' || !!pair.partnerDeleted}
                        >
                          Eine Frage stellen
                        </button>
                      </div>

                      {pair?.id !== v2PairId ? (
                          <div className="row">
                            <div className="empty" style={{ width: '100%' }}>Verknüpfung wird geladen…</div>
                          </div>
                      ) : null}

                      {pair ? (
                          <>
                            {pair.partnerDeleted ? <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div> : null}
                            <div className="divider" />
                            <div className="row pair-headline">
                              <div className="pair-headline-main">
                                <ProfileAvatar name={pair.partner?.nickname ?? '??'} />
                                <h2 style={{ margin: 0 }}>{pair.partner ? `${pair.partner.nickname} (${pair.partner.code ?? '—'})` : pair.id}</h2>
                              </div>
                              <div className={`pill status ${pair.status === 'active' ? 'ok' : 'pending'}`}>{pair.status}</div>
                            </div>
                            <div className="row pair-quick-links">
                              <button className="link-btn" onClick={() => scrollToSection(playSectionRef)} title="Zu Fragen spielen springen">
                                ✣ Fragen spielen
                              </button>
                              <button className="link-btn" onClick={() => scrollToSection(matchesSectionRef)} title="Zu Matches springen">
                                ✣ Matches
                              </button>
                              <button className="link-btn" onClick={() => scrollToSection(groupSettingsSectionRef)} title="Zu Gruppeneinstellungen springen">
                                ✣ Gruppeneinstellungen
                              </button>
                            </div>

                            {pair.partnerDeleted ? null : (
                                <>
                                  <div className="divider" />
                                  <div className="row">
                                    {(() => {
                                      const weeklyLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
                                      const isUnlimited = weeklyLimit === 0
                                      const answeredThisWeek = pair.usage?.answeredThisWeek ?? 0
                                      const remainingNew = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, weeklyLimit - answeredThisWeek)

                                      const openNonOwn = questions.filter((q) => {
                                        const total = answerSummary[q.id]?.total ?? 0
                                        const mine = answerSummary[q.id]?.mine
                                        if (total >= 2) return false
                                        if (mine) return false
                                        return q.createdBy !== identity?.userId
                                      }).length

                                      const remainingToAnswer = Math.min(remainingNew, openNonOwn)
                                      const showRemainingHint = remainingToAnswer > 0 || (remainingNew === 0 && openNonOwn > 0)

                                      return (
                                          <>
                                            {isUnlimited ? <div className="pill mono">Wochenlimit: Alle Fragen erlaubt</div> : showRemainingHint ? <div className="pill mono">Noch {remainingToAnswer} zu beantwortende Fragen für diese Woche</div> : null}
                                            {!isUnlimited && remainingNew === 0 && openNonOwn > 0 ? <div className="pill mono">Limit erreicht</div> : null}
                                          </>
                                      )
                                    })()}
                                  </div>

                                  <div className="divider" />
                                  <h2 ref={playSectionRef}>Fragen spielen</h2>
                                  {isLoadingPairData ? <div className="hint">⏳ Fragen werden geladen…</div> : (() => {
                                    if (!identity?.userId) return <div className="empty">Nicht eingeloggt.</div>
                                    const weeklyLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit
                                    const isUnlimited = weeklyLimit === 0
                                    const answeredThisWeek = pair.usage?.answeredThisWeek ?? 0
                                    const remainingNew = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, weeklyLimit - answeredThisWeek)

                                    const base = questions
                                        .slice()
                                        .filter((q) => (answerSummary[q.id]?.total ?? 0) < 2)

                                    const unansweredAll = base.filter((q) => !answerSummary[q.id]?.mine)
                                    const openNonOwn = unansweredAll.filter((q) => q.createdBy !== identity.userId).length
                                    const playedPending = base.filter((q) => !!answerSummary[q.id]?.mine)

                                    const unanswered = remainingNew > 0 ? unansweredAll : unansweredAll.filter((q) => q.createdBy === identity.userId)
                                    const ordered = unanswered.sort((a, b) => b.createdAt - a.createdAt)

                                    const showLimitNotice = !isUnlimited && remainingNew === 0 && openNonOwn > 0
                                    const limitReached = !isUnlimited && remainingNew === 0
                                    const allCurrentAnswered = questions.length > 0 && unansweredAll.length === 0 && openNonOwn === 0
                                    const showBlockingLimitNotice = limitReached && openNonOwn > 0

                                    if (!ordered.length) {
                                      return (
                                          <>
                                            {showBlockingLimitNotice ? (
                                                <div className="notice">
                                                  Wochenlimit erreicht. Reset am {nextWeeklyResetDateText()}. Danach geht es mit {openNonOwn} offenen Partner-Fragen weiter.
                                                </div>
                                            ) : (
                                                <>
                                                  {allCurrentAnswered ? (
                                                      <div className="success-badge success-done" role="status" aria-live="polite">
                                                        <strong>Alles beantwortet</strong>
                                                        <span>
                  Für den Moment gibt es hier nichts zu tun. Du kannst aber{' '}
                                                          <button className="inline-link-btn" onClick={() => goV2Ask(pair.id)}>
                    eine neue Frage
                  </button>{' '}
                                                          stellen, die ihr beantworten dürft.
                </span>
                                                      </div>
                                                  ) : null}
                                                  {!allCurrentAnswered ? <div className="empty">Keine offenen Fragen für dich.</div> : null}
                                                </>
                                            )}
                                            {playedPending.length ? (
                                                <div className="row">
                                                  <button className="secondary" onClick={() => goV2Played(pair.id)}>
                                                    ✣ Deine Antworten, Partner noch offen ({playedPending.length})
                                                  </button>
                                                </div>
                                            ) : null}
                                          </>
                                      )
                                    }

                                    const safeIndex = Math.min(v2CardIndex, Math.max(0, ordered.length - 1))
                                    const q = ordered[safeIndex]
                                    const canAnswerNew = q.createdBy === identity.userId || remainingNew > 0

                                    return (
                                        <>
                                          {showLimitNotice ? (
                                              <div className="notice">
                                                Wochenlimit erreicht. Du kannst diese Woche keine neuen Antworten mehr abgeben. Bereits beantwortete Fragen mit offenem Partner-Status kannst du noch anpassen. Reset am {nextWeeklyResetDateText()}. Danach geht es mit {openNonOwn} offenen Partner-Fragen weiter.
                                              </div>
                                          ) : null}
                                          <div className="play-card">
                                            <div className="row play-top">
                                              <div className="pill mono">
                                                Frage {safeIndex + 1}/{ordered.length}
                                              </div>
                                              <div className="hint mono">Antworten: {answerSummary[q.id]?.total ?? 0}/2</div>
                                            </div>
                                            <div className="play-question">{q.text}</div>
                                            <div className="row play-actions">
                                              <button className="choice yes" onClick={() => answer(q.id, 'yes')} disabled={!canAnswerNew}>
                                                Ja
                                              </button>
                                              <button className="choice maybe" onClick={() => answer(q.id, 'maybe')} disabled={!canAnswerNew}>
                                                Vielleicht
                                              </button>
                                              <button className="choice no" onClick={() => answer(q.id, 'no')} disabled={!canAnswerNew}>
                                                Nein
                                              </button>
                                            </div>
                                            <div className="row play-nav">
                                              <button className="secondary" onClick={() => setV2CardIndex(Math.max(0, safeIndex - 1))} disabled={safeIndex <= 0}>
                                                Vorige
                                              </button>
                                              <button className="secondary" onClick={() => setV2CardIndex(Math.min(ordered.length - 1, safeIndex + 1))} disabled={safeIndex >= ordered.length - 1}>
                                                Nächste
                                              </button>
                                            </div>
                                          </div>
                                          {playedPending.length ? (
                                              <div className="row" style={{ marginTop: 12 }}>
                                                <button className="secondary" onClick={() => goV2Played(pair.id)}>
                                                  ✣ Deine Antworten, Partner noch offen ({playedPending.length})
                                                </button>
                                              </div>
                                          ) : null}
                                        </>
                                    )
                                  })()}

                                  <div className="divider" />
                                  <div className="row" ref={matchesSectionRef}>
                                    <h2 style={{ margin: 0 }}>{showHiddenMatches ? `Ausgeblendete Matches (${visibleMatchesCount})` : `Matches (${visibleMatchesCount})`}</h2>
                                    <RefreshButton onClick={() => computeMatches()} title="Matches neu berechnen" />
                                  </div>
                                  {isLoadingMatches ? (
                                      <div className="hint">⏳ Matches werden geladen…</div>
                                  ) : matches.length ? (
                                      <div className="match-grid">
                                        {matches
                                            .filter((m) => (showHiddenMatches ? hiddenMatchIds.includes(m.id) : !hiddenMatchIds.includes(m.id)))
                                            .map((m) => (
                                                <div className={`match-card ${m.grade}`} key={m.id}>
                                                  <div className="match-head">
                                                    <div className="match-title">{m.question}</div>
                                                    <div className={`badge ${m.grade}`}>
                                                      {m.grade === 'perfect' ? '💜 Perfekt' : m.grade === 'maybe' ? '🟣 Vielleicht' : '⚪ Okay'}
                                                    </div>
                                                  </div>
                                                  <div className="match-answers">
                                                    {m.answers.map((a, i) => (
                                                        <span className={`answer-pill ${a}`} key={i}>
                                {a === 'yes' ? 'Ja' : a === 'maybe' ? 'Vielleicht' : 'Nein'}
                              </span>
                                                    ))}
                                                  </div>
                                                  <div className="match-card-actions">
                                                    <button
                                                        className="secondary icon-btn mini"
                                                        title={showHiddenMatches ? 'Match wieder anzeigen' : 'Match ausblenden'}
                                                        onClick={() =>
                                                            setHiddenMatchIds((prev) =>
                                                                showHiddenMatches ? prev.filter((id) => id !== m.id) : prev.includes(m.id) ? prev : [...prev, m.id],
                                                            )
                                                        }
                                                    >
                                                      <MatchVisibilityIcon hidden={!showHiddenMatches} />
                                                    </button>
                                                  </div>
                                                </div>
                                            ))}
                                      </div>
                                  ) : (
                                      <div className="empty">Noch keine Matches.</div>
                                  )}
                                  {!isLoadingMatches && matches.length > 0 &&
                                  (showHiddenMatches ? matches.filter((m) => hiddenMatchIds.includes(m.id)).length === 0 : matches.filter((m) => !hiddenMatchIds.includes(m.id)).length === 0) ? (
                                      <div className="empty">{showHiddenMatches ? 'Keine ausgeblendeten Matches.' : 'Alle Matches sind ausgeblendet.'}</div>
                                  ) : (
                                      <></>
                                  )}
                                  {hiddenMatchIds.length ? (
                                      <div className="row" style={{ marginTop: 8 }}>
                                        <button
                                            className="secondary small-btn"
                                            onClick={() => setShowHiddenMatches((prev) => !prev)}
                                            title={showHiddenMatches ? 'Zur normalen Match-Ansicht wechseln' : 'Ausgeblendete Matches anzeigen'}
                                        >
                                          {showHiddenMatches ? '✣ Matches anzeigen' : '✣ Ausgeblendete Matches anzeigen'}
                                        </button>
                                      </div>
                                  ) : null}
                                  <div className="divider" />
                                  <div className="row" ref={groupSettingsSectionRef}>
                                    <h2 style={{ margin: 0 }}>Gruppen-Einstellungen</h2>
                                    <RefreshButton onClick={refreshGroupSettingsPanel} title="Gruppen-Einstellungen neu laden" />
                                  </div>
                                  {isLoadingGroupSettings ? (
                                      <div className="hint">⏳ Gruppen-Einstellungen werden geladen…</div>
                                  ) : (
                                      <div className="settings-panel">
                                        <div className="settings-item">
                                          <div className="settings-item-title">Fragenlimit pro Woche</div>
                                          <p className="settings-text">
                                            Wenn aktiviert können pro Spieler nur x Fragen pro Woche beantwortet werden, erst in der darauf folgenden Woche gibt es weitere Fragen. So ist die Spannung jede Woche groß, ob es ein weiteres Match gibt.
                                          </p>
                                          <div className="row">
                                            <label className="toggle">
                                              <input
                                                  type="checkbox"
                                                  checked={!v2AllowAllQuestions}
                                                  onChange={(e) => setV2AllowAllQuestions(!e.target.checked)}
                                                  disabled={!!pair.weeklyLimitPending || isLoadingGroupSettings}
                                              />
                                              <span>Limit aktivieren</span>
                                            </label>
                                            {v2AllowAllQuestions ? (
                                                <div className="pill mono">Alle Fragen erlaubt</div>
                                            ) : (
                                                <label className="field inline">
                                                  <span>Fragen / Woche</span>
                                                  <input
                                                      value={weeklyLimitInput}
                                                      onChange={(e) => setWeeklyLimitInput(e.target.value)}
                                                      disabled={!!pair.weeklyLimitPending || isLoadingGroupSettings}
                                                  />
                                                </label>
                                            )}
                                            <button
                                                className="secondary"
                                                onClick={proposeV2GroupSettings}
                                                disabled={
                                                    !apiReady ||
                                                    !!pair.weeklyLimitPending ||
                                                    isLoadingGroupSettings ||
                                                    !Number.isFinite(v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)) ||
                                                    (v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)) < 0 ||
                                                    (v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)) > 50 ||
                                                    (v2AllowAllQuestions ? 0 : Number(weeklyLimitInput)) === (pair.usage?.weeklyLimit ?? pair.weeklyLimit)
                                                }
                                            >
                                              Vorschlagen
                                            </button>
                                          </div>
                                          <div className="settings-current">Aktuell: {pair.weeklyLimit === 0 ? 'Alle Fragen erlaubt' : `${pair.weeklyLimit} Fragen pro Woche`}</div>
                                        </div>
                                        {pair.weeklyLimitPending ? (
                                            <div className="settings-pending-block">
                                              <div className="settings-item-title">Offene Einstellungsanfrage</div>
                                              {pair.weeklyLimitPending.proposedBy === identity?.userId ? (
                                                  <div className="request request-panel">
                                                    <div className="row request-panel-head settings-request-head">
                                                      <div>
                                                        <div className="pair-card-name">Fragenlimit pro Woche</div>
                                                        <div className="pair-card-code mono">
                                                          {pair.weeklyLimitPending.limit === 0 ? 'Alle Fragen erlauben' : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                                                        </div>
                                                      </div>
                                                      <button
                                                          className="secondary action-cancel"
                                                          onClick={() => respondV2GroupSettings('cancel')}
                                                          disabled={!apiReady || isLoadingGroupSettings}
                                                          title="Eigenen Vorschlag zurückziehen"
                                                      >
                                                        Zurückziehen
                                                      </button>
                                                    </div>
                                                  </div>
                                              ) : (
                                                  <div className="request request-panel">
                                                    <div className="row request-panel-head settings-request-head">
                                                      <div>
                                                        <div className="pair-card-name">Fragenlimit pro Woche</div>
                                                        <div className="pair-card-code mono">
                                                          {pair.weeklyLimitPending.limit === 0 ? 'Alle Fragen erlauben' : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="row request-actions">
                                                      <button className="action-accept" onClick={() => respondV2GroupSettings('accept')} disabled={!apiReady || isLoadingGroupSettings}>
                                                        ✓ Annehmen
                                                      </button>
                                                      <button className="action-reject" onClick={() => respondV2GroupSettings('reject')} disabled={!apiReady || isLoadingGroupSettings}>
                                                        ✕ Ablehnen
                                                      </button>
                                                    </div>
                                                  </div>
                                              )}
                                            </div>
                                        ) : null}
                                      </div>
                                  )}
                                </>
                            )}
                          </>
                      ) : (
                          <div className="empty">Verknüpfung nicht geladen.</div>
                      )}
                    </section>
                ) : v2Mode === 'ask' && v2PairId ? (
                    <section className="card v2-detail v2-view">
                      <div className="row">
                        <button className="secondary" onClick={() => goV2Pair(v2PairId)}>
                          ← Zurück
                        </button>
                        <h2 style={{ margin: 0 }}>Eigene Frage stellen</h2>
                      </div>
                      <p className="hint v2-view-subtitle">Neue Frage erstellen und deine eigene Antwort direkt speichern.</p>
                      <div className="divider" />
                      <label className="field">
                        <span>Frage</span>
                        <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="z.B. Möchtest du …" />
                      </label>
                      <div className="ask-answers">
                        <button type="button" className={`choice yes ${questionSelfAnswer === 'yes' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('yes')}>
                          Ja
                        </button>
                        <button type="button" className={`choice maybe ${questionSelfAnswer === 'maybe' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('maybe')}>
                          Vielleicht
                        </button>
                        <button type="button" className={`choice no ${questionSelfAnswer === 'no' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('no')}>
                          Nein
                        </button>
                      </div>
                      <div className="ask-save">
                        <button
                            className="primary"
                            onClick={async () => {
                              setV2AskError(null)
                              const text = questionText.trim()
                              if (!text) {
                                setV2AskError('Bitte gib eine Frage ein.')
                                return
                              }
                              if (!questionSelfAnswer) {
                                setV2AskError('Bitte wähle Ja/Vielleicht/Nein.')
                                return
                              }
                              await addQuestion()
                              goV2Pair(v2PairId)
                            }}
                            disabled={!pair || pair.status !== 'active' || !questionText.trim() || !questionSelfAnswer}
                        >
                          Speichern
                        </button>
                      </div>
                      {v2AskError ? <div className="inline-error">{v2AskError}</div> : null}
                    </section>
                ) : v2Mode === 'played' && v2PairId ? (
                    <section className="card v2-detail v2-view">
                      <div className="row">
                        <button className="secondary" onClick={() => goV2Pair(v2PairId)}>
                          ← Zurück
                        </button>
                        <h2 style={{ margin: 0 }}>Deine Antworten, Partner noch offen</h2>
                      </div>
                      <p className="hint v2-view-subtitle">Hier siehst du nur Fragen, die du bereits beantwortet hast, aber dein Partner noch nicht.</p>
                      <div className="divider" />
                      {!pair || pair.id !== v2PairId ? (
                          <div className="empty">Verknüpfung wird geladen…</div>
                      ) : (
                          (() => {
                            const pending = questions
                                .filter((q) => (answerSummary[q.id]?.total ?? 0) < 2 && !!answerSummary[q.id]?.mine)
                                .sort((a, b) => b.createdAt - a.createdAt)
                            if (!pending.length) return <div className="empty">Du hast aktuell keine Antworten mit offenem Partner-Status.</div>
                            return (
                                <div className="played-list played-page">
                                  {pending.map((pq) => {
                                    const mine = answerSummary[pq.id]?.mine
                                    const total = answerSummary[pq.id]?.total ?? 0
                                    const locked = total >= 2
                                    return (
                                        <div className="play-card answered" key={pq.id}>
                                          <div className="row play-top">
                                            <div className="pill mono">Von dir beantwortet</div>
                                            <div className="hint mono">
                                              Antworten: {total}/2
                                            </div>
                                          </div>
                                          <div className="play-question">{pq.text}</div>
                                          <div className="row play-actions">
                                            <button className={`choice yes ${mine === 'yes' ? 'active' : ''}`} onClick={() => answer(pq.id, 'yes')} disabled={locked}>
                                              Ja
                                            </button>
                                            <button className={`choice maybe ${mine === 'maybe' ? 'active' : ''}`} onClick={() => answer(pq.id, 'maybe')} disabled={locked}>
                                              Vielleicht
                                            </button>
                                            <button className={`choice no ${mine === 'no' ? 'active' : ''}`} onClick={() => answer(pq.id, 'no')} disabled={locked}>
                                              Nein
                                            </button>
                                          </div>
                                        </div>
                                    )
                                  })}
                                </div>
                            )
                          })()
                      )}
                    </section>
                ) : (
                    <section className="card v2-home">
                      {myPairs.length ? (
                          <>
                            <h2>Deine Partner</h2>
                            <div className="pair-panel">
                              <p className="hint">Wähle eine Verknüpfung aus, um direkt in die Fragen-Ansicht zu wechseln.</p>
                              <div className="pair-cards">
                                {myPairs.map((p) => (
                                    <button
                                        key={p.id}
                                        className="pair-card-btn"
                                        onClick={async () => {
                                          if (p.partnerDeleted) return
                                          goV2Pair(p.id)
                                          await openPairInV2(p.id)
                                        }}
                                        disabled={p.partnerDeleted}
                                    >
                                      <div className="pair-card-main">
                                        <ProfileAvatar name={p.partnerDeleted ? 'G' : p.partner?.nickname ?? '?'} />
                                        <div>
                                          <div className="pair-card-name">{p.partnerDeleted ? 'Gelöscht' : p.partner?.nickname ?? p.id}</div>
                                          <div className="pair-card-code mono">{p.partnerDeleted ? '—' : p.partner?.code ?? '—'}</div>
                                        </div>
                                      </div>
                                      <div className="pair-card-meta">
                                        <div className={`pill mono status ${p.status === 'active' ? 'ok' : 'pending'}`}>{p.status}</div>
                                        <div className="hint">Öffnen →</div>
                                      </div>
                                    </button>
                                ))}
                              </div>
                            </div>
                            <div className="divider" />
                          </>
                      ) : null}

                      <h2>Mit Partner verknüpfen</h2>
                      <div className="pair-panel">
                        <p className="hint">
                          Gib den Code deines Partners ein und sende die Anfrage. Dein Partner muss sie annehmen. Danach muss dein Partner ebenfalls dir eine Anfrage senden und du musst annehmen.
                        </p>
                        <div className="row">
                          <input value={partnerCodeInput} onChange={(e) => setPartnerCodeInput(e.target.value)} placeholder="Partner-Code" />
                          <button onClick={sendPairRequest}>Anfrage senden</button>
                        </div>
                      </div>
                      {pairingInlineError ? <div className="inline-error">{pairingInlineError}</div> : null}

                      <div className="divider" />
                      <h2>Offene Verknüpfungs-Anfragen</h2>
                      <div className="request-panel-list">
                        {(() => {
                          const grouped = new Map<
                              string,
                              {
                                nickname: string
                                code: string
                                incomingIds: string[]
                                outgoingIds: string[]
                              }
                          >()
                          for (const r of pairingIncoming) {
                            const key = `${r.from.code}|${r.from.nickname}`
                            const existing = grouped.get(key) ?? { nickname: r.from.nickname, code: r.from.code, incomingIds: [], outgoingIds: [] }
                            existing.incomingIds.push(r.id)
                            grouped.set(key, existing)
                          }
                          for (const r of pairingOutgoing) {
                            const key = `${r.to.code}|${r.to.nickname}`
                            const existing = grouped.get(key) ?? { nickname: r.to.nickname, code: r.to.code, incomingIds: [], outgoingIds: [] }
                            existing.outgoingIds.push(r.id)
                            grouped.set(key, existing)
                          }
                          const rows = Array.from(grouped.entries()).sort((a, b) => a[1].nickname.localeCompare(b[1].nickname, 'de'))
                          if (!rows.length) return <div className="empty">Keine offenen Anfragen.</div>
                          return rows.map(([key, row]) => (
                              <div className="request request-panel" key={key}>
                                <div className="row request-panel-head">
                                  <div className="request-user">
                                    <ProfileAvatar name={row.nickname} />
                                    <div>
                                      <div className="pair-card-name">{row.nickname}</div>
                                      <div className="pair-card-code mono">{row.code}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="row request-actions">
                                  {row.incomingIds.length ? (
                                      <>
                                        <button
                                            className="action-accept"
                                            title="Anfrage annehmen und Verknüpfung bestätigen"
                                            onClick={() => respond(row.incomingIds[0], 'accept')}
                                        >
                                          ✓ Annehmen
                                        </button>
                                        <button className="action-reject" title="Anfrage ablehnen" onClick={() => respond(row.incomingIds[0], 'reject')}>
                                          ✕ Ablehnen
                                        </button>
                                      </>
                                  ) : null}
                                  {row.outgoingIds.length ? (
                                      <button
                                          className="secondary action-cancel"
                                          title="Ausgehende Anfrage zurückziehen, wenn du diese Person nicht mehr hinzufügen möchtest"
                                          onClick={() => respond(row.outgoingIds[0], 'cancel')}
                                      >
                                        Zurückziehen
                                      </button>
                                  ) : null}
                                </div>
                              </div>
                          ))
                        })()}
                      </div>
                    </section>
                )}
              </div>
            </>
        )}

        {error ? (
            <section className="card error">
              <h2>Fehler</h2>
              <pre className="pre">{error}</pre>
            </section>
        ) : null}
      </main>
  )

  return (
      <div className="app-shell">
        {header}
        {uiVersion === 1 ? version1 : version2}
        {uiVersion === 2 && savedToast ? <div className="toast">{savedToast}</div> : null}
      </div>
  )
}

export default App
