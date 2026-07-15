import { createContext, useContext, type Context } from "react";
import type { ToastState } from "../../hooks/useToast";
import type { MatchView } from "../../hooks/useMatches";
import type { MyPairs, PairingIncoming, PairingOutgoing } from "../../hooks/usePairing";
import type { Identity } from "../../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../types";
import type { AppRoute } from "../routes";

export type PublicIdentity = {
  userId: string;
  nickname: string;
  code?: string | null;
};

export type BootstrapAccountResult = Identity | null;

export type SessionContextValue = {
  identity: PublicIdentity | null;
  nicknameDraft: string;
  isBootstrappingAccount: boolean;
  updateNicknameDraft: (next: string) => void;
  bootstrapAccount: () => Promise<BootstrapAccountResult>;
  registerAccount: (nickname?: string) => Promise<void>;
};

export type PairingContextValue = {
  incoming: PairingIncoming;
  outgoing: PairingOutgoing;
  myPairs: MyPairs;
  inlineError: string | null;
  clearInlineError: () => void;
  refreshRequests: () => Promise<void>;
  sendPairRequest: (partnerCodeInput: string) => Promise<void>;
  respondPairing: (
    requestId: string,
    action: "accept" | "reject" | "cancel"
  ) => Promise<{ pairId?: string | null } | void>;
};

export type PairWorkspaceContextValue = {
  route: AppRoute;
  pair: PairView | null;
  isLoadingPairData: boolean;
  openPair: (pairId: string) => Promise<void>;
  openPairRoute: (pairId: string) => void;
  refreshPairView: () => Promise<void>;
};

export type QuestionsContextValue = {
  questions: DecryptedQuestion[];
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  answerQuestion: (questionId: string, choice: AnswerChoice) => Promise<void>;
  addQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>;
};

export type MatchesContextValue = {
  matches: MatchView[];
  isLoadingMatches: boolean;
  hiddenMatchIds: string[];
  showHiddenMatches: boolean;
  visibleMatchesCount: number;
  computeMatches: () => Promise<void>;
  hideMatch: (matchId: string) => void;
  restoreMatch: (matchId: string) => void;
  toggleHiddenMatchesView: () => void;
};

export type GroupSettingsContextValue = {
  weeklyLimitDraft: string;
  allowAllQuestions: boolean;
  isLoadingGroupSettings: boolean;
  updateWeeklyLimitDraft: (value: string) => void;
  setQuestionsUnlimited: (enabled: boolean) => void;
  refreshGroupSettings: () => Promise<void>;
  proposeGroupSettings: () => Promise<void>;
  respondGroupSettings: (action: "accept" | "reject" | "cancel") => Promise<void>;
};

export type AccountContextValue = {
  accountDeletedModalOpen: boolean;
  setAccountDeletedModalOpen: (open: boolean) => void;
  copyPairingCode: () => Promise<void>;
  exportBackupText: () => Promise<string>;
  importBackupText: (txt: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export type FeedbackContextValue = {
  toast: ToastState | null;
  inlineNotice: string | null;
  error: string | null;
  setGlobalError: (message: string | null) => void;
  clearGlobalError: () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
export const PairingContext = createContext<PairingContextValue | null>(null);
export const PairWorkspaceContext = createContext<PairWorkspaceContextValue | null>(null);
export const QuestionsContext = createContext<QuestionsContextValue | null>(null);
export const MatchesContext = createContext<MatchesContextValue | null>(null);
export const GroupSettingsContext = createContext<GroupSettingsContextValue | null>(null);
export const AccountContext = createContext<AccountContextValue | null>(null);
export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function useRequiredContext<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used within AppProviders`);
  return value;
}

export function useSessionContext() {
  return useRequiredContext(SessionContext, "useSessionContext");
}

export function usePairingContext() {
  return useRequiredContext(PairingContext, "usePairingContext");
}

export function usePairWorkspaceContext() {
  return useRequiredContext(PairWorkspaceContext, "usePairWorkspaceContext");
}

export function useQuestionsContext() {
  return useRequiredContext(QuestionsContext, "useQuestionsContext");
}

export function useMatchesContext() {
  return useRequiredContext(MatchesContext, "useMatchesContext");
}

export function useGroupSettingsContext() {
  return useRequiredContext(GroupSettingsContext, "useGroupSettingsContext");
}

export function useAccountContext() {
  return useRequiredContext(AccountContext, "useAccountContext");
}

export function useFeedbackContext() {
  return useRequiredContext(FeedbackContext, "useFeedbackContext");
}
