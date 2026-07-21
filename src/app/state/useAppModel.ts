import { useCallback } from "react";
import type { FeedbackContextValue, SessionContextValue } from "./AppContexts";
import { useAccountModel } from "./models/useAccountModel";
import { useFeedbackModel } from "./models/feedback/useFeedbackModel";
import { useMatchesModel } from "./models/useMatchesModel";
import { usePairingModel } from "./models/usePairingModel";
import { usePairSelectionModel } from "./models/usePairSelectionModel";
import { usePairWorkspaceModel } from "./models/usePairWorkspaceModel";
import { useQuestionsModel } from "./models/useQuestionsModel";
import { useSessionModel } from "./models/useSessionModel";
import type {
  AccountContextValue,
  GroupSettingsContextValue,
  MatchesContextValue,
  PairWorkspaceContextValue,
  PairingContextValue,
  QuestionsContextValue
} from "./AppContexts";

export type AppModel = {
  account: AccountContextValue;
  feedback: FeedbackContextValue;
  groupSettings: GroupSettingsContextValue;
  matches: MatchesContextValue;
  pairWorkspace: PairWorkspaceContextValue;
  pairing: PairingContextValue;
  questions: QuestionsContextValue;
  session: SessionContextValue;
};

export function useAppModel(): AppModel {
  const feedbackModel = useFeedbackModel();
  const { clearGlobalError, feedback, setGlobalError, showNotice } = feedbackModel;
  const sessionModel = useSessionModel();
  const pairingModel = usePairingModel({
    apiClient: sessionModel.apiClient,
    identity: sessionModel.identity,
    clearGlobalError
  });
  const pairSelectionModel = usePairSelectionModel({
    apiClient: sessionModel.apiClient,
    identity: sessionModel.identity,
    refreshPairing: pairingModel.refreshPairing
  });
  const questionsModel = useQuestionsModel({
    apiClient: sessionModel.apiClient,
    identity: sessionModel.identity,
    pair: pairSelectionModel.pairSelection.pair,
    matchPolicy: pairSelectionModel.groupSettings.matchPolicy,
    clearGlobalError,
    setGlobalError,
    refreshCurrentPair: pairSelectionModel.pairSelection.refreshCurrentPair
  });
  const matchesModel = useMatchesModel({
    apiClient: sessionModel.apiClient,
    identity: sessionModel.identity,
    pair: pairSelectionModel.pairSelection.pair
  });
  const pairWorkspaceModel = usePairWorkspaceModel({
    apiClient: sessionModel.apiClient,
    pair: pairSelectionModel.pairSelection.pair,
    selectPair: pairSelectionModel.pairSelection.selectPair,
    isLoadingPairData: pairSelectionModel.pairSelection.isLoadingPairData,
    refreshPairing: pairingModel.refreshPairing,
    questionActions: questionsModel.questionActions,
    matchActions: matchesModel.matchActions
  });
  const account = useAccountModel({
    apiClient: sessionModel.apiClient,
    identity: sessionModel.identity,
    resetLocalIdentity: sessionModel.resetLocalIdentity,
    setIdentity: sessionModel.setIdentity,
    setPair: pairSelectionModel.pairSelection.setPair,
    clearMatches: matchesModel.matchActions.clearMatches,
    clearQuestions: questionsModel.questionActions.clearQuestions,
    clearGlobalError,
    showNotice
  });

  const registerAccount = useCallback(
    async (nicknameOverride?: string) => {
      clearGlobalError();
      const nextIdentity = await sessionModel.registerIdentity(nicknameOverride);
      await pairingModel.refreshPairing(nextIdentity);
    },
    [clearGlobalError, pairingModel, sessionModel]
  );

  return {
    account,
    feedback,
    groupSettings: pairSelectionModel.groupSettings,
    matches: matchesModel.matches,
    pairWorkspace: pairWorkspaceModel.pairWorkspace,
    pairing: pairingModel.pairing,
    questions: questionsModel.questions,
    session: {
      ...sessionModel.session,
      registerAccount
    }
  };
}
