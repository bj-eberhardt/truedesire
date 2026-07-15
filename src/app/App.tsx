import { useCallback, useState } from "react";
import { ErrorPanel } from "../components/ErrorPanel";
import { useApiClient } from "../hooks/useApiClient";
import { useHiddenMatches } from "../hooks/useHiddenMatches";
import { useIdentity } from "../hooks/useIdentity";
import { useMatches } from "../hooks/useMatches";
import { usePairSelection } from "../hooks/usePairSelection";
import { usePairing } from "../hooks/usePairing";
import { useQuestions } from "../hooks/useQuestions";
import { useToast } from "../hooks/useToast";
import { V3Shell } from "../features/v3/V3Shell";
import { AccountDeletedModal } from "./components/AccountDeletedModal";
import { useAccountActions } from "./hooks/useAccountActions";
import { useAppRoute } from "./hooks/useAppRoute";
import { useInlineNotice } from "./hooks/useInlineNotice";
import { usePairWorkspace } from "./hooks/usePairWorkspace";

const MIN_LOADING_MS = 1500;

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const { route, pairRouteMode, pairRoutePairId } = useAppRoute();
  const { notice: v3InlineNotice, showNotice } = useInlineNotice();

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

  const { openPair, refreshPairView, isRefreshingPairView, visiblePairMatchesCount } =
    usePairWorkspace({
      apiClient,
      pair,
      pairRouteMode,
      pairRoutePairId,
      matches,
      hiddenMatchIds,
      showHiddenMatches,
      setShowHiddenMatches,
      visibleMatchesCount,
      selectPair,
      refreshCurrentPairing: refreshPairing,
      refreshSystemQuestionHashes,
      ensureSystemQuestionsSeeded,
      loadQuestionsAndDecrypt,
      clearQuestions,
      clearMatches,
      computeMatches
    });

  const {
    accountDeletedModalOpen,
    setAccountDeletedModalOpen,
    exportBackupText,
    importBackupText,
    deleteAccount
  } = useAccountActions({
    apiClient,
    bootstrap,
    resetLocalIdentity,
    setIdentity,
    setPair,
    clearMatches,
    clearQuestions
  });

  const registerAndRefreshPairing = useCallback(
    async (nicknameOverride?: string) => {
      setError(null);
      const nextIdentity = await register(nicknameOverride);
      await refreshPairing(nextIdentity);
    },
    [refreshPairing, register]
  );

  const deleteAccountAndClearError = useCallback(async () => {
    setError(null);
    await deleteAccount();
  }, [deleteAccount]);

  const importBackupTextAndClearError = useCallback(
    async (txt: string) => {
      setError(null);
      await importBackupText(txt);
    },
    [importBackupText]
  );

  const sendPairRequestAndClearError = useCallback(
    async (code: string) => {
      setError(null);
      await sendPairRequest(code);
    },
    [sendPairRequest]
  );

  const respondPairingAndClearError = useCallback(
    async (requestId: string, action: "accept" | "reject" | "cancel") => {
      setError(null);
      return await respondPairing(requestId, action);
    },
    [respondPairing]
  );

  const answerAndHandleError = useCallback(
    async (questionId: string, choice: Parameters<typeof answer>[1]) => {
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
    },
    [answer, loadQuestionsAndDecrypt, refreshCurrentPair]
  );

  const addQuestionAndClearError = useCallback(
    async (text: string, selfAnswer: Parameters<typeof addQuestion>[1]) => {
      setError(null);
      await addQuestion(text, selfAnswer);
    },
    [addQuestion]
  );

  const computeCurrentMatches = useCallback(async () => {
    await computeMatches(pair ?? undefined);
  }, [computeMatches, pair]);

  const copyPairingCode = useCallback(async () => {
    if (!identity?.code) return;
    await navigator.clipboard.writeText(identity.code);
    showNotice("Pairing-Code wurde in die Zwischenablage kopiert.");
  }, [identity, showNotice]);

  return (
    <div className="app-shell">
      <AccountDeletedModal
        open={accountDeletedModalOpen}
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
        onRegister={registerAndRefreshPairing}
        onDeleteAccount={deleteAccountAndClearError}
        onImportBackupText={importBackupTextAndClearError}
        pairingIncoming={pairingIncoming}
        pairingOutgoing={pairingOutgoing}
        myPairs={myPairs}
        pairingInlineError={pairingInlineError}
        onClearPairingInlineError={clearPairingInlineError}
        onRefreshPairingRequests={refreshPairingRequests}
        onSendPairRequest={sendPairRequestAndClearError}
        onRespondPairing={respondPairingAndClearError}
        pair={pair}
        isLoadingPairData={isLoadingPairData || isRefreshingPairView}
        onOpenPair={openPair}
        onRefreshPairView={refreshPairView}
        questions={questions}
        answerSummary={answerSummary}
        onAnswer={answerAndHandleError}
        onAddQuestion={addQuestionAndClearError}
        matches={matches}
        isLoadingMatches={isLoadingMatches}
        onComputeMatches={computeCurrentMatches}
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
        onCopyPairingCode={copyPairingCode}
        inlineNotice={v3InlineNotice}
      />
      {error ? <ErrorPanel error={error} /> : null}
    </div>
  );
}
