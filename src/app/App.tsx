import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseAppRoute } from './routes'
import { ErrorPanel } from '../components/ErrorPanel'
import { exportBackup, importBackup } from '../state/identity'
import { idbGet, idbSet } from '../storage/idb'
import { useApiClient } from '../hooks/useApiClient'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useHiddenMatches } from '../hooks/useHiddenMatches'
import { useIdentity } from '../hooks/useIdentity'
import { useMatches } from '../hooks/useMatches'
import { usePairSelection } from '../hooks/usePairSelection'
import { usePairing } from '../hooks/usePairing'
import { useQuestions } from '../hooks/useQuestions'
import { useToast } from '../hooks/useToast'
import { V1Page } from '../features/v1/V1Page'
import { V2Shell } from '../features/v2/V2Shell'
import { V3Shell } from '../features/v3/V3Shell'
import { VersionHome } from './VersionHome'
import { InfoModal } from '../components/InfoModal'

export default function App() {
  const MIN_LOADING_MS = 1500
  const [error, setError] = useState<string | null>(null)
  const [accountDeletedModalOpen, setAccountDeletedModalOpen] = useState(false)
  const [v3InlineNotice, setV3InlineNotice] = useState<string | null>(null)
  const v3InlineNoticeTimerRef = useRef<number | null>(null)

  const { identity, nickname, setNickname, isBootstrappingAccount, bootstrap, register, resetLocalIdentity, setIdentity } = useIdentity()
  const apiClient = useApiClient(identity)

  const { toast, showToast } = useToast(1600)

  const {
    pairingIncoming,
    pairingOutgoing,
    myPairs,
    pairingInlineError,
    clearPairingInlineError,
    refreshPairing,
    sendPairRequest,
    respond: respondPairing,
  } = usePairing(apiClient, identity)

  const {
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
  } = usePairSelection({ apiClient, identity, refreshPairing, minLoadingMs: MIN_LOADING_MS })

  const { hiddenMatchIds, setHiddenMatchIds, showHiddenMatches, setShowHiddenMatches, visibleMatchesCount } = useHiddenMatches(pair?.id ?? null)

  const {
    questions,
    answerSummary,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    addQuestion,
    deleteQuestion,
    answer,
    isPartnerAnswered,
    clearQuestions,
  } = useQuestions({
    apiClient,
    identity,
    pair,
    onSaved: showToast,
    onAnswerLimitReached: (reached) => {
      // Keep old behavior: show a sticky notice in v1; v2 uses pair usage to indicate.
      if (!reached) return
    },
    refreshCurrentPair,
  })

  const { matches, isLoadingMatches, clearMatches, computeMatches } = useMatches({ apiClient, identity, pair, minLoadingMs: MIN_LOADING_MS })

  useEffect(() => {
    if (!showHiddenMatches) return
    const hiddenCount = matches.filter((m) => hiddenMatchIds.includes(m.id)).length
    if (hiddenCount === 0) setShowHiddenMatches(false)
  }, [showHiddenMatches, matches, hiddenMatchIds, setShowHiddenMatches])

  const [autoRefresh, setAutoRefresh] = useState(false)
  useAutoRefresh(autoRefresh, async () => refreshPairing(), 5000)

  const [route, setRoute] = useState(() => parseAppRoute(window.location.hash))
  const pairRoute = route.kind === 'v2' || route.kind === 'v3' ? route.route : null
  const pairRouteMode = pairRoute?.mode ?? null
  const pairRoutePairId = pairRoute?.pairId ?? null
  useEffect(() => {
    const onHash = () => setRoute(parseAppRoute(window.location.hash))
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // URL-based version routing:
  // - `#/` shows the chooser.
  // - `#/v1` renders v1.
  // - `#/v2...` renders v2.
  // - `#/v3...` renders v3.
  // - missing version prefix but old v2 routes => treated as v2.
  // - no hash at all (`''` or `'#'`) => redirect to newest (`#/v3`).

  // URL fallback to newest version when no version is specified (no hash at all).
  useEffect(() => {
    if (window.location.hash === '' || window.location.hash === '#') window.location.hash = '#/v3'
  }, [])

  // Version switch is done via the VersionHome page links (no global header).

  const openPair = useCallback(
    async (pairId: string) => {
      const p = await selectPair(pairId)
      clearMatches()
      clearQuestions()
      if (!p) return
      await refreshSystemQuestionHashes()
      await ensureSystemQuestionsSeeded(p)
      await loadQuestionsAndDecrypt(p)
      await computeMatches(p)
    },
    [clearMatches, clearQuestions, computeMatches, ensureSystemQuestionsSeeded, loadQuestionsAndDecrypt, refreshSystemQuestionHashes, selectPair],
  )

  const initialPreloadDoneRef = useRef(false)
  useEffect(() => {
    if (!apiClient) return
    if (initialPreloadDoneRef.current) return
    initialPreloadDoneRef.current = true
    ;(async () => {
      try {
        await refreshPairing()
        const routeTargetPairId =
          (route.kind === 'v2' || route.kind === 'v3') &&
          pairRoutePairId &&
          (pairRouteMode === 'pair' || pairRouteMode === 'ask' || pairRouteMode === 'played')
            ? pairRoutePairId
            : null
        const last = await idbGet<string>('ui:lastPairId')
        const targetPairId = routeTargetPairId ?? last
        if (targetPairId) await openPair(targetPairId)
      } catch {
        // ignore
      }
    })()
  }, [apiClient, openPair, refreshPairing, pairRouteMode, pairRoutePairId, route.kind])

  const refreshV2PairView = useCallback(async () => {
    await refreshPairing()
    const targetPairId = (route.kind === 'v2' || route.kind === 'v3') ? pairRoutePairId ?? pair?.id : pair?.id
    if (!targetPairId) return
    try {
      await openPair(targetPairId)
    } catch {
      // ignore
    }
  }, [openPair, pair?.id, refreshPairing, route.kind, pairRoutePairId])

  const doExportBackup = useCallback(async () => {
    const txt = await exportBackup()
    await navigator.clipboard.writeText(txt)
    alert('Backup (JSON) wurde in die Zwischenablage kopiert.')
  }, [])

  const exportBackupText = useCallback(async (): Promise<string> => {
    return await exportBackup()
  }, [])

  const doImportBackup = useCallback(async () => {
    const txt = prompt('Backup JSON einfügen:')
    if (!txt) return
    await importBackup(txt)
    await bootstrap()
    alert('Import abgeschlossen.')
  }, [bootstrap])

  const importBackupText = useCallback(
    async (txt: string) => {
      await importBackup(txt)
      await bootstrap()
    },
    [bootstrap],
  )

  const unpair = useCallback(
    async (pairId: string) => {
      if (!apiClient) return
      await apiClient.pairs.unpair(pairId)
      setPair(null)
      clearMatches()
      clearQuestions()
      await idbSet('ui:lastPairId', '')
      await refreshPairing()
    },
    [apiClient, clearMatches, clearQuestions, refreshPairing, setPair],
  )

  const deleteAccount = useCallback(async () => {
    try {
      if (apiClient) await apiClient.auth.deleteMe()
    } catch {
      // allow local delete even if server delete fails
    }
    await resetLocalIdentity()
    await idbSet('ui:lastPairId', '')
    setPair(null)
    clearMatches()
    clearQuestions()
    setIdentity(null)
    window.location.hash = '#/v3'
    setAccountDeletedModalOpen(true)
  }, [apiClient, clearMatches, clearQuestions, resetLocalIdentity, setIdentity, setPair])

  const v2VisibleMatchesCount = useMemo(() => visibleMatchesCount(matches.map((m) => m.id)), [matches, visibleMatchesCount])

  return (
    <div className="app-shell">
      <InfoModal
        open={accountDeletedModalOpen}
        title="Account gelöscht"
        message="Der Account wurde gelöscht. Das lässt sich nicht rückgängig machen."
        okLabel="OK"
        autoCloseMs={1800}
        onClose={() => setAccountDeletedModalOpen(false)}
      />
      {route.kind === 'versionHome' ? (
        <VersionHome />
      ) : route.kind === 'v1' ? (
        <V1Page
          identityUserId={identity?.userId ?? null}
          identityCode={identity?.code ?? null}
          nickname={nickname}
          onNicknameChange={setNickname}
          onRegister={async () => {
            await register()
          }}
          onExportBackup={doExportBackup}
          onImportBackup={doImportBackup}
          pairingIncoming={pairingIncoming}
          pairingOutgoing={pairingOutgoing}
          myPairs={myPairs}
          onRefreshPairing={refreshPairing}
          onSendPairRequest={async (code) => {
            await sendPairRequest(code)
          }}
          onRespondPairing={respondPairing}
          pair={pair}
          onSelectPair={openPair}
          weeklyLimitInput={weeklyLimitInput}
          onWeeklyLimitInputChange={setWeeklyLimitInput}
          onProposeWeeklyLimit={proposeWeeklyLimit}
          onRespondWeeklyLimit={respondWeeklyLimit}
          onUnpair={unpair}
          questions={questions}
          answerSummary={answerSummary}
          isPartnerAnswered={isPartnerAnswered}
          onReloadQuestions={async () => loadQuestionsAndDecrypt()}
          onAddQuestion={async (text, selfAnswer) => addQuestion(text, selfAnswer)}
          onDeleteQuestion={deleteQuestion}
          onAnswer={async (questionId, choice) => {
            await answer(questionId, choice)
          }}
          answerLimitReached={answerLimitReached}
          autoRefreshEnabled={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          matches={matches}
          onComputeMatches={async () => computeMatches(pair ?? undefined)}
          onError={setError}
        />
      ) : route.kind === 'v2' ? (
        <V2Shell
          route={route.kind === 'v2' ? route.route : { mode: 'home', pairId: null }}
          isBootstrappingAccount={isBootstrappingAccount}
          identity={identity ? { userId: identity.userId!, nickname: identity.nickname, code: identity.code } : null}
          nickname={nickname}
          onNicknameChange={setNickname}
          onRegister={async () => {
            setError(null)
            await register()
            await refreshPairing()
          }}
          onExportBackup={doExportBackup}
          onImportBackup={doImportBackup}
          onDeleteAccount={async () => {
            setError(null)
            await deleteAccount()
          }}
          onImportBackupText={async (txt) => {
            setError(null)
            await importBackupText(txt)
          }}
          pairingIncoming={pairingIncoming}
          pairingOutgoing={pairingOutgoing}
          myPairs={myPairs}
          pairingInlineError={pairingInlineError}
          onClearPairingInlineError={clearPairingInlineError}
          onSendPairRequest={async (code) => {
            setError(null)
            await sendPairRequest(code)
          }}
          onRespondPairing={async (requestId, action) => {
            setError(null)
            await respondPairing(requestId, action)
          }}
          pair={pair}
          isLoadingPairData={isLoadingPairData}
          onOpenPair={openPair}
          onRefreshPairView={refreshV2PairView}
          questions={questions}
          answerSummary={answerSummary}
          onAnswer={async (questionId, choice) => {
            setError(null)
            try {
              await answer(questionId, choice)
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e))
              try {
                await refreshCurrentPair()
                await loadQuestionsAndDecrypt()
              } catch {
                // ignore
              }
            }
          }}
          onAddQuestion={async (text, selfAnswer) => {
            setError(null)
            await addQuestion(text, selfAnswer)
          }}
          matches={matches}
          isLoadingMatches={isLoadingMatches}
          onComputeMatches={async () => computeMatches(pair ?? undefined)}
          hiddenMatchIds={hiddenMatchIds}
          setHiddenMatchIds={setHiddenMatchIds}
          showHiddenMatches={showHiddenMatches}
          setShowHiddenMatches={setShowHiddenMatches}
          visibleMatchesCount={v2VisibleMatchesCount}
          weeklyLimitInput={weeklyLimitInput}
          setWeeklyLimitInput={setWeeklyLimitInput}
          v2AllowAllQuestions={v2AllowAllQuestions}
          setV2AllowAllQuestions={setV2AllowAllQuestions}
          isLoadingGroupSettings={isLoadingGroupSettings}
          onRefreshGroupSettings={refreshGroupSettingsPanel}
          onProposeGroupSettings={proposeV2GroupSettings}
          onRespondGroupSettings={respondV2GroupSettings}
          toast={toast}
        />
      ) : (
        <V3Shell
          route={route.kind === 'v3' ? route.route : { mode: 'home', pairId: null }}
          isBootstrappingAccount={isBootstrappingAccount}
          identity={identity ? { userId: identity.userId!, nickname: identity.nickname, code: identity.code } : null}
          nickname={nickname}
          onNicknameChange={setNickname}
          onBootstrap={bootstrap}
          onRegister={async () => {
            setError(null)
            await register()
            await refreshPairing()
          }}
          onDeleteAccount={async () => {
            setError(null)
            await deleteAccount()
          }}
          onImportBackupText={async (txt) => {
            setError(null)
            await importBackupText(txt)
          }}
          pairingIncoming={pairingIncoming}
          pairingOutgoing={pairingOutgoing}
          myPairs={myPairs}
          pairingInlineError={pairingInlineError}
          onClearPairingInlineError={clearPairingInlineError}
          onSendPairRequest={async (code) => {
            setError(null)
            await sendPairRequest(code)
          }}
          onRespondPairing={async (requestId, action) => {
            setError(null)
            await respondPairing(requestId, action)
          }}
          pair={pair}
          isLoadingPairData={isLoadingPairData}
          onOpenPair={openPair}
          onRefreshPairView={refreshV2PairView}
          questions={questions}
          answerSummary={answerSummary}
          onAnswer={async (questionId, choice) => {
            setError(null)
            try {
              await answer(questionId, choice)
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : String(e))
              try {
                await refreshCurrentPair()
                await loadQuestionsAndDecrypt()
              } catch {
                // ignore
              }
            }
          }}
          onAddQuestion={async (text, selfAnswer) => {
            setError(null)
            await addQuestion(text, selfAnswer)
          }}
          matches={matches}
          isLoadingMatches={isLoadingMatches}
          onComputeMatches={async () => computeMatches(pair ?? undefined)}
          hiddenMatchIds={hiddenMatchIds}
          setHiddenMatchIds={setHiddenMatchIds}
          showHiddenMatches={showHiddenMatches}
          setShowHiddenMatches={setShowHiddenMatches}
          visibleMatchesCount={v2VisibleMatchesCount}
          weeklyLimitInput={weeklyLimitInput}
          setWeeklyLimitInput={setWeeklyLimitInput}
          v2AllowAllQuestions={v2AllowAllQuestions}
          setV2AllowAllQuestions={setV2AllowAllQuestions}
          isLoadingGroupSettings={isLoadingGroupSettings}
          onRefreshGroupSettings={refreshGroupSettingsPanel}
          onProposeGroupSettings={proposeV2GroupSettings}
          onRespondGroupSettings={respondV2GroupSettings}
          toast={toast}
          onExportBackupText={exportBackupText}
          onCopyPairingCode={async () => {
            if (!identity?.code) return
            await navigator.clipboard.writeText(identity.code)
            setV3InlineNotice('Pairing-Code wurde in die Zwischenablage kopiert.')
            if (v3InlineNoticeTimerRef.current) window.clearTimeout(v3InlineNoticeTimerRef.current)
            v3InlineNoticeTimerRef.current = window.setTimeout(() => setV3InlineNotice(null), 1400)
          }}
          inlineNotice={v3InlineNotice}
        />
      )}
      {error ? <ErrorPanel error={error} /> : null}
    </div>
  )
}
