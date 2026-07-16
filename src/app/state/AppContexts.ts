import { createContext, useContext, type Context } from "react";
import type {
  AccountContextValue,
  FeedbackContextValue,
  GroupSettingsContextValue,
  MatchesContextValue,
  PairingContextValue,
  PairWorkspaceContextValue,
  QuestionsContextValue,
  SessionContextValue
} from "./types";

export type {
  AccountContextValue,
  BootstrapAccountResult,
  FeedbackContextValue,
  GroupSettingsContextValue,
  MatchesContextValue,
  MyPairs,
  PairingContextValue,
  PairingIncoming,
  PairingOutgoing,
  PairWorkspaceContextValue,
  PublicIdentity,
  QuestionsContextValue,
  SessionContextValue
} from "./types";

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
