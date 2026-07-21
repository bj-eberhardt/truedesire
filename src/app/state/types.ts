import type { MatchView } from "../../domain/matches/computeMatchViews";
import type { Identity } from "../../state/identity";
import type { AnswerChoice, DecryptedQuestion, MatchPolicy, PairView } from "../../types";
import type { AppRoute } from "../routes";

export type ToastKind = "default" | "success" | "error";

export type ToastState = {
  message: string;
  kind?: ToastKind;
};

export type PublicIdentity = {
  userId: string;
  nickname: string;
  code?: string | null;
};

export type BootstrapAccountResult = Identity | null;
export type BootstrapAccountStatus = "loading" | "ready" | "unauthorized" | "temporary";
export type BootstrapAccountOptions = {
  showLoadingScreen?: boolean;
};

export type PairingIncoming = Array<{
  id: string;
  from: { id: string; code: string; nickname: string };
  createdAt: number;
}>;

export type PairingOutgoing = Array<{
  id: string;
  to: { id: string; code: string; nickname: string };
  createdAt: number;
}>;

export type MyPairs = Array<{
  id: string;
  status: "pending" | "active" | "ended";
  weeklyLimit: number;
  partnerDeleted: boolean;
  partner: { id: string; nickname: string; code: string } | null;
  updatedAt: number;
}>;

export type SessionContextValue = {
  identity: PublicIdentity | null;
  nicknameDraft: string;
  bootstrapAccountStatus: BootstrapAccountStatus;
  isBootstrappingAccount: boolean;
  updateNicknameDraft: (next: string) => void;
  bootstrapAccount: (opts?: BootstrapAccountOptions) => Promise<BootstrapAccountResult>;
  registerAccount: (nickname?: string) => Promise<void>;
};

export type PairingContextValue = {
  incoming: PairingIncoming;
  outgoing: PairingOutgoing;
  myPairs: MyPairs;
  inlineError: string | null;
  clearInlineError: () => void;
  refreshRequests: () => Promise<void>;
  sendPairRequest: (partnerCodeInput: string) => Promise<boolean>;
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
  matchPolicy: MatchPolicy;
  matchPolicyDraft: MatchPolicy;
  isLoadingGroupSettings: boolean;
  updateWeeklyLimitDraft: (value: string) => void;
  setQuestionsUnlimited: (enabled: boolean) => void;
  updateMatchPolicyDraft: (policy: MatchPolicy) => void;
  refreshGroupSettings: () => Promise<void>;
  proposeGroupSettings: () => Promise<void>;
  respondGroupSettings: (action: "accept" | "reject" | "cancel") => Promise<void>;
  proposeMatchPolicy: () => Promise<void>;
  respondMatchPolicy: (action: "accept" | "reject" | "cancel") => Promise<void>;
};

export type AccountContextValue = {
  copyPairingCode: () => Promise<void>;
  exportBackupText: () => Promise<string>;
  importBackupText: (txt: string) => Promise<void>;
  deleteLocalAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export type FeedbackContextValue = {
  toast: ToastState | null;
  inlineNotice: string | null;
  error: string | null;
  setGlobalError: (message: string | null) => void;
  clearGlobalError: () => void;
};
