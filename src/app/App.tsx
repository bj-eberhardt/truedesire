import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseV2Route } from './routes'
import { AppHeader } from '../components/AppHeader'
import { ErrorPanel } from '../components/ErrorPanel'
import { Toast } from '../components/Toast'
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

export default function App() {
  const MIN_LOADING_MS = 1500
  const [uiVersion, setUiVersion] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)

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

  const [route, setRoute] = useState(() => parseV2Route(window.location.hash))
  useEffect(() => {
    const onHash = () => setRoute(parseV2Route(window.location.hash))
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    ;(async () => {
      const savedVersion = await idbGet<number>('ui:version')
      if (savedVersion === 2) setUiVersion(2)
    })()
  }, [])

  const switchVersion = useCallback(async (v: 1 | 2) => {
    setUiVersion(v)
    await idbSet('ui:version', v)
  }, [])

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
        const routeTargetPairId = uiVersion === 2 && route.pairId && (route.mode === 'pair' || route.mode === 'ask' || route.mode === 'played') ? route.pairId : null
        const last = await idbGet<string>('ui:lastPairId')
        const targetPairId = routeTargetPairId ?? last
        if (targetPairId) await openPair(targetPairId)
      } catch {
        // ignore
      }
    })()
  }, [apiClient, openPair, refreshPairing, route.mode, route.pairId, uiVersion])

  const refreshV2PairView = useCallback(async () => {
    await refreshPairing()
    const targetPairId = route.pairId ?? pair?.id
    if (!targetPairId) return
    try {
      await openPair(targetPairId)
    } catch {
      // ignore
    }
  }, [openPair, pair?.id, refreshPairing, route.pairId])

  const doExportBackup = useCallback(async () => {
    const txt = await exportBackup()
    await navigator.clipboard.writeText(txt)
    alert('Backup (JSON) wurde in die Zwischenablage kopiert.')
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
    if (!apiClient) return
    try {
      await apiClient.auth.deleteMe()
    } catch {
      // allow local delete even if server delete fails
    }
    await resetLocalIdentity()
    await idbSet('ui:lastPairId', '')
    setPair(null)
    clearMatches()
    clearQuestions()
    setIdentity(null)
    window.location.hash = '#/'
  }, [apiClient, clearMatches, clearQuestions, resetLocalIdentity, setIdentity, setPair])

  const header = (
    <AppHeader uiVersion={uiVersion} onSwitchVersion={switchVersion} onExportBackup={doExportBackup} onImportBackup={doImportBackup} />
  )

  const v2VisibleMatchesCount = useMemo(() => visibleMatchesCount(matches.map((m) => m.id)), [matches, visibleMatchesCount])

  return (
    <div className="app-shell">
      {header}
      {uiVersion === 1 ? (
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
      ) : (
        <V2Shell
          route={route}
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
        />
      )}
      {uiVersion === 2 && toast ? <Toast message={toast} /> : null}
      {error ? <ErrorPanel error={error} /> : null}
    </div>
  )
}
