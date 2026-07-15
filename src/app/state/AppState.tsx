import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ErrorPanel } from "../../components/ErrorPanel";
import { Toast } from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { useApiClient } from "../../hooks/useApiClient";
import { useHiddenMatches } from "../../hooks/useHiddenMatches";
import { useIdentity } from "../../hooks/useIdentity";
import { useMatches } from "../../hooks/useMatches";
import { usePairSelection } from "../../hooks/usePairSelection";
import { usePairing } from "../../hooks/usePairing";
import { useQuestions } from "../../hooks/useQuestions";
import type { AnswerChoice } from "../../types";
import { AccountDeletedModal } from "../components/AccountDeletedModal";
import { useAccountActions } from "../hooks/useAccountActions";
import { useAppRoute } from "../hooks/useAppRoute";
import { useInlineNotice } from "../hooks/useInlineNotice";
import { usePairWorkspace } from "../hooks/usePairWorkspace";
import {
  AccountContext,
  FeedbackContext,
  GroupSettingsContext,
  MatchesContext,
  PairWorkspaceContext,
  PairingContext,
  QuestionsContext,
  SessionContext,
  useAccountContext,
  useFeedbackContext,
  type AccountContextValue,
  type FeedbackContextValue,
  type GroupSettingsContextValue,
  type MatchesContextValue,
  type PairWorkspaceContextValue,
  type PairingContextValue,
  type PublicIdentity,
  type QuestionsContextValue,
  type SessionContextValue
} from "./AppContexts";

const MIN_LOADING_MS = 1500;

export function AppProviders({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const { route, pairRouteMode, pairRoutePairId } = useAppRoute();
  const { notice: inlineNotice, showNotice } = useInlineNotice();

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

  const clearGlobalError = useCallback(() => setError(null), []);

  const registerAccount = useCallback(
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

  const answerQuestion = useCallback(
    async (questionId: string, choice: AnswerChoice) => {
      setError(null);
      try {
        await answer(questionId, choice);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        try {
          await refreshCurrentPair();
          await loadQuestionsAndDecrypt();
        } catch {
          // ignore refresh errors after answer failure
        }
        throw e;
      }
    },
    [answer, loadQuestionsAndDecrypt, refreshCurrentPair]
  );

  const addQuestionAndClearError = useCallback(
    async (text: string, selfAnswer: AnswerChoice) => {
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

  const hideMatch = useCallback(
    (matchId: string) => {
      setHiddenMatchIds((prev) => (prev.includes(matchId) ? prev : [...prev, matchId]));
    },
    [setHiddenMatchIds]
  );

  const restoreMatch = useCallback(
    (matchId: string) => {
      setHiddenMatchIds((prev) => prev.filter((id) => id !== matchId));
    },
    [setHiddenMatchIds]
  );

  const toggleHiddenMatchesView = useCallback(() => {
    setShowHiddenMatches((prev) => !prev);
  }, [setShowHiddenMatches]);

  const openPairRoute = useCallback((pairId: string) => {
    window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}`;
  }, []);

  const publicIdentity = useMemo<PublicIdentity | null>(() => {
    if (!identity?.userId) return null;
    return { userId: identity.userId, nickname: identity.nickname, code: identity.code };
  }, [identity]);

  const sessionValue = useMemo<SessionContextValue>(
    () => ({
      identity: publicIdentity,
      nicknameDraft: nickname,
      isBootstrappingAccount,
      updateNicknameDraft: setNickname,
      bootstrapAccount: bootstrap,
      registerAccount
    }),
    [bootstrap, isBootstrappingAccount, nickname, publicIdentity, registerAccount, setNickname]
  );

  const pairingValue = useMemo<PairingContextValue>(
    () => ({
      incoming: pairingIncoming,
      outgoing: pairingOutgoing,
      myPairs,
      inlineError: pairingInlineError,
      clearInlineError: clearPairingInlineError,
      refreshRequests: refreshPairingRequests,
      sendPairRequest: sendPairRequestAndClearError,
      respondPairing: respondPairingAndClearError
    }),
    [
      clearPairingInlineError,
      myPairs,
      pairingIncoming,
      pairingInlineError,
      pairingOutgoing,
      refreshPairingRequests,
      respondPairingAndClearError,
      sendPairRequestAndClearError
    ]
  );

  const pairWorkspaceValue = useMemo<PairWorkspaceContextValue>(
    () => ({
      route,
      pair,
      isLoadingPairData: isLoadingPairData || isRefreshingPairView,
      openPair,
      openPairRoute,
      refreshPairView
    }),
    [isLoadingPairData, isRefreshingPairView, openPair, openPairRoute, pair, refreshPairView, route]
  );

  const questionsValue = useMemo<QuestionsContextValue>(
    () => ({
      questions,
      answerSummary,
      answerQuestion,
      addQuestion: addQuestionAndClearError
    }),
    [addQuestionAndClearError, answerQuestion, answerSummary, questions]
  );

  const matchesValue = useMemo<MatchesContextValue>(
    () => ({
      matches,
      isLoadingMatches,
      hiddenMatchIds,
      showHiddenMatches,
      visibleMatchesCount: visiblePairMatchesCount,
      computeMatches: computeCurrentMatches,
      hideMatch,
      restoreMatch,
      toggleHiddenMatchesView
    }),
    [
      computeCurrentMatches,
      hiddenMatchIds,
      hideMatch,
      isLoadingMatches,
      matches,
      restoreMatch,
      showHiddenMatches,
      toggleHiddenMatchesView,
      visiblePairMatchesCount
    ]
  );

  const groupSettingsValue = useMemo<GroupSettingsContextValue>(
    () => ({
      weeklyLimitDraft: weeklyLimitInput,
      allowAllQuestions,
      isLoadingGroupSettings,
      updateWeeklyLimitDraft: setWeeklyLimitInput,
      setQuestionsUnlimited: setAllowAllQuestions,
      refreshGroupSettings: refreshGroupSettingsPanel,
      proposeGroupSettings,
      respondGroupSettings
    }),
    [
      allowAllQuestions,
      isLoadingGroupSettings,
      proposeGroupSettings,
      refreshGroupSettingsPanel,
      respondGroupSettings,
      setAllowAllQuestions,
      setWeeklyLimitInput,
      weeklyLimitInput
    ]
  );

  const accountValue = useMemo<AccountContextValue>(
    () => ({
      accountDeletedModalOpen,
      setAccountDeletedModalOpen,
      copyPairingCode,
      exportBackupText,
      importBackupText: importBackupTextAndClearError,
      deleteAccount: deleteAccountAndClearError
    }),
    [
      accountDeletedModalOpen,
      copyPairingCode,
      deleteAccountAndClearError,
      exportBackupText,
      importBackupTextAndClearError,
      setAccountDeletedModalOpen
    ]
  );

  const feedbackValue = useMemo<FeedbackContextValue>(
    () => ({
      toast,
      inlineNotice,
      error,
      setGlobalError: setError,
      clearGlobalError
    }),
    [clearGlobalError, error, inlineNotice, toast]
  );

  return (
    <FeedbackContext.Provider value={feedbackValue}>
      <SessionContext.Provider value={sessionValue}>
        <AccountContext.Provider value={accountValue}>
          <PairingContext.Provider value={pairingValue}>
            <PairWorkspaceContext.Provider value={pairWorkspaceValue}>
              <QuestionsContext.Provider value={questionsValue}>
                <MatchesContext.Provider value={matchesValue}>
                  <GroupSettingsContext.Provider value={groupSettingsValue}>
                    {children}
                  </GroupSettingsContext.Provider>
                </MatchesContext.Provider>
              </QuestionsContext.Provider>
            </PairWorkspaceContext.Provider>
          </PairingContext.Provider>
        </AccountContext.Provider>
      </SessionContext.Provider>
    </FeedbackContext.Provider>
  );
}

export function AppGlobalChrome({ children }: { children: ReactNode }) {
  const account = useAccountContext();
  const feedback = useFeedbackContext();

  return (
    <div className="app-shell">
      <AccountDeletedModal
        open={account.accountDeletedModalOpen}
        onClose={() => account.setAccountDeletedModalOpen(false)}
      />
      {children}
      {feedback.toast ? <Toast message={feedback.toast.message} kind={feedback.toast.kind} /> : null}
      {feedback.error ? <ErrorPanel error={feedback.error} /> : null}
    </div>
  );
}
