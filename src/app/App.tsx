import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseAppRoute } from "./routes";
import { ErrorPanel } from "../components/ErrorPanel";
import { exportBackup, importBackup } from "../state/identity";
import { idbGet, idbSet } from "../storage/idb";
import { useApiClient } from "../hooks/useApiClient";
import { useHiddenMatches } from "../hooks/useHiddenMatches";
import { useIdentity } from "../hooks/useIdentity";
import { useMatches } from "../hooks/useMatches";
import { usePairSelection } from "../hooks/usePairSelection";
import { usePairing } from "../hooks/usePairing";
import { useQuestions } from "../hooks/useQuestions";
import { useToast } from "../hooks/useToast";
import { V3Shell } from "../features/v3/V3Shell";
import { InfoModal } from "../components/InfoModal";

export default function App() {
  const MIN_LOADING_MS = 1500;
  const [error, setError] = useState<string | null>(null);
  const [accountDeletedModalOpen, setAccountDeletedModalOpen] = useState(false);
  const [v3InlineNotice, setV3InlineNotice] = useState<string | null>(null);
  const [isRefreshingPairView, setIsRefreshingPairView] = useState(false);
  const v3InlineNoticeTimerRef = useRef<number | null>(null);

  const {
    identity,
    nickname,
    setNickname,
    isBootstrappingAccount,
    bootstrap,
    register,
    resetLocalIdentity,
    setIdentity
  } = useIdentity();
  const apiClient = useApiClient(identity);

  const { toast } = useToast(1600);

  const {
    pairingIncoming,
    pairingOutgoing,
    myPairs,
    pairingInlineError,
    clearPairingInlineError,
    refreshPairing,
    refreshPairingRequests,
    sendPairRequest,
    respond: respondPairing
  } = usePairing(apiClient, identity);

  const {
    pair,
    setPair,
    weeklyLimitInput,
    setWeeklyLimitInput,
    allowAllQuestions,
    setAllowAllQuestions,
    isLoadingPairData,
    isLoadingGroupSettings,
    selectPair,
    refreshCurrentPair,
    refreshGroupSettingsPanel,
    proposeGroupSettings,
    respondGroupSettings
  } = usePairSelection({ apiClient, identity, refreshPairing, minLoadingMs: MIN_LOADING_MS });
  const {
    hiddenMatchIds,
    setHiddenMatchIds,
    showHiddenMatches,
    setShowHiddenMatches,
    visibleMatchesCount
  } = useHiddenMatches(pair?.id ?? null);

  const {
    questions,
    answerSummary,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    addQuestion,
    answer,
    clearQuestions
  } = useQuestions({
    apiClient,
    identity,
    pair,
    onAnswerLimitReached: () => {},
    refreshCurrentPair
  });

  const { matches, isLoadingMatches, clearMatches, computeMatches } = useMatches({
    apiClient,
    identity,
    pair,
    minLoadingMs: MIN_LOADING_MS
  });

  useEffect(() => {
    if (!showHiddenMatches) return;
    const hiddenCount = matches.filter((m) => hiddenMatchIds.includes(m.id)).length;
    if (hiddenCount === 0) setShowHiddenMatches(false);
  }, [showHiddenMatches, matches, hiddenMatchIds, setShowHiddenMatches]);

  const [route, setRoute] = useState(() => parseAppRoute(window.location.hash));
  const pairRoute = route.route;
  const pairRouteMode = pairRoute?.mode ?? null;
  const pairRoutePairId = pairRoute?.pairId ?? null;
  useEffect(() => {
    const onHash = () => setRoute(parseAppRoute(window.location.hash));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const openPair = useCallback(
    async (pairId: string, opts?: { preserveCurrent?: boolean }) => {
      const p = await selectPair(pairId);
      if (!opts?.preserveCurrent) {
        clearMatches();
        clearQuestions();
      }
      if (!p) return;
      await refreshSystemQuestionHashes();
      await ensureSystemQuestionsSeeded(p);
      await loadQuestionsAndDecrypt(p);
      await computeMatches(p);
    },
    [
      clearMatches,
      clearQuestions,
      computeMatches,
      ensureSystemQuestionsSeeded,
      loadQuestionsAndDecrypt,
      refreshSystemQuestionHashes,
      selectPair
    ]
  );

  const initialPreloadDoneRef = useRef(false);
  useEffect(() => {
    if (!apiClient) return;
    if (initialPreloadDoneRef.current) return;
    initialPreloadDoneRef.current = true;
    (async () => {
      try {
        await refreshPairing();
        const routeTargetPairId =
          pairRoutePairId &&
          (pairRouteMode === "pair" || pairRouteMode === "ask" || pairRouteMode === "played")
            ? pairRoutePairId
            : null;
        const last = await idbGet<string>("ui:lastPairId");
        const targetPairId = routeTargetPairId ?? last;
        if (targetPairId) await openPair(targetPairId);
      } catch {
        // ignore
      }
    })();
  }, [apiClient, openPair, refreshPairing, pairRouteMode, pairRoutePairId]);

  const refreshPairView = useCallback(async () => {
    const targetPairId = pairRoutePairId ?? pair?.id;
    if (!targetPairId) return;
    setIsRefreshingPairView(true);
    try {
      await refreshPairing();
      await openPair(targetPairId, { preserveCurrent: true });
    } catch {
      // ignore
    } finally {
      setIsRefreshingPairView(false);
    }
  }, [openPair, pair?.id, refreshPairing, pairRoutePairId]);

  const exportBackupText = useCallback(async (): Promise<string> => {
    return await exportBackup();
  }, []);

  const importBackupText = useCallback(
    async (txt: string) => {
      await importBackup(txt);
      await bootstrap();
    },
    [bootstrap]
  );

  const deleteAccount = useCallback(async () => {
    try {
      if (apiClient) await apiClient.auth.deleteMe();
    } catch {
      // allow local delete even if server delete fails
    }
    await resetLocalIdentity();
    await idbSet("ui:lastPairId", "");
    setPair(null);
    clearMatches();
    clearQuestions();
    setIdentity(null);
    window.location.hash = "#/v3";
    setAccountDeletedModalOpen(true);
  }, [apiClient, clearMatches, clearQuestions, resetLocalIdentity, setIdentity, setPair]);

  const visiblePairMatchesCount = useMemo(
    () => visibleMatchesCount(matches.map((m) => m.id)),
    [matches, visibleMatchesCount]
  );

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
      <V3Shell
        route={route.route}
        isBootstrappingAccount={isBootstrappingAccount}
        identity={
          identity
            ? { userId: identity.userId!, nickname: identity.nickname, code: identity.code }
            : null
        }
        nickname={nickname}
        onNicknameChange={setNickname}
        onBootstrap={bootstrap}
        onRegister={async () => {
          setError(null);
          await register();
          await refreshPairing();
        }}
        onDeleteAccount={async () => {
          setError(null);
          await deleteAccount();
        }}
        onImportBackupText={async (txt) => {
          setError(null);
          await importBackupText(txt);
        }}
        pairingIncoming={pairingIncoming}
        pairingOutgoing={pairingOutgoing}
        myPairs={myPairs}
        pairingInlineError={pairingInlineError}
        onClearPairingInlineError={clearPairingInlineError}
        onRefreshPairingRequests={refreshPairingRequests}
        onSendPairRequest={async (code) => {
          setError(null);
          await sendPairRequest(code);
        }}
        onRespondPairing={async (requestId, action) => {
          setError(null);
          return await respondPairing(requestId, action);
        }}
        pair={pair}
        isLoadingPairData={isLoadingPairData || isRefreshingPairView}
        onOpenPair={openPair}
        onRefreshPairView={refreshPairView}
        questions={questions}
        answerSummary={answerSummary}
        onAnswer={async (questionId, choice) => {
          setError(null);
          try {
            await answer(questionId, choice);
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
            try {
              await refreshCurrentPair();
              await loadQuestionsAndDecrypt();
            } catch {
              // ignore
            }
          }
        }}
        onAddQuestion={async (text, selfAnswer) => {
          setError(null);
          await addQuestion(text, selfAnswer);
        }}
        matches={matches}
        isLoadingMatches={isLoadingMatches}
        onComputeMatches={async () => computeMatches(pair ?? undefined)}
        hiddenMatchIds={hiddenMatchIds}
        setHiddenMatchIds={setHiddenMatchIds}
        showHiddenMatches={showHiddenMatches}
        setShowHiddenMatches={setShowHiddenMatches}
        visibleMatchesCount={visiblePairMatchesCount}
        weeklyLimitInput={weeklyLimitInput}
        setWeeklyLimitInput={setWeeklyLimitInput}
        allowAllQuestions={allowAllQuestions}
        setAllowAllQuestions={setAllowAllQuestions}
        isLoadingGroupSettings={isLoadingGroupSettings}
        onRefreshGroupSettings={refreshGroupSettingsPanel}
        onProposeGroupSettings={proposeGroupSettings}
        onRespondGroupSettings={respondGroupSettings}
        toast={toast}
        onExportBackupText={exportBackupText}
        onCopyPairingCode={async () => {
          if (!identity?.code) return;
          await navigator.clipboard.writeText(identity.code);
          setV3InlineNotice("Pairing-Code wurde in die Zwischenablage kopiert.");
          if (v3InlineNoticeTimerRef.current) window.clearTimeout(v3InlineNoticeTimerRef.current);
          v3InlineNoticeTimerRef.current = window.setTimeout(() => setV3InlineNotice(null), 1400);
        }}
        inlineNotice={v3InlineNotice}
      />
      {error ? <ErrorPanel error={error} /> : null}
    </div>
  );
}
