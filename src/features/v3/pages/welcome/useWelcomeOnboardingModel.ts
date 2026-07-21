import { useCallback, useState } from "react";
import { goV3Onboarding, type V3Route } from "../../../../app/routes";
import {
  useAccountContext,
  usePairingContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";
import { activeOnboardingStepId, onboardingSteps } from "./onboardingSteps";
import { useBackupDownloadFlow } from "./useBackupDownloadFlow";
import { useBackupImportDraft } from "./useBackupImportDraft";
import { useCreateAccountFlow } from "./useCreateAccountFlow";

type OnboardingPath = NonNullable<V3Route["onboard"]>;

export function useWelcomeOnboardingModel() {
  const {
    identity,
    nicknameDraft,
    isBootstrappingAccount,
    updateNicknameDraft,
    registerAccount,
    bootstrapAccount
  } = useSessionContext();
  const { copyPairingCode, importBackupText, exportBackupText } = useAccountContext();
  const pairing = usePairingContext();
  const { route } = usePairWorkspaceContext();
  const onboardPath: OnboardingPath = route.route.onboard ?? "start";
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [pairRequestSent, setPairRequestSent] = useState(false);
  const [isSendingPairRequest, setIsSendingPairRequest] = useState(false);

  const setOnboardingStep = useCallback((step: OnboardingPath) => {
    goV3Onboarding(step);
  }, []);

  const backupImport = useBackupImportDraft({ importBackupText, setOnboardError });
  const createAccount = useCreateAccountFlow({
    bootstrapAccount,
    registerAccount,
    setOnboardingStep,
    setOnboardError
  });
  const backupDownload = useBackupDownloadFlow({
    bootstrapAccount,
    exportBackupText,
    identity,
    setOnboardError
  });

  const chooseBackupImport = useCallback(() => {
    setOnboardError(null);
    backupImport.resetBackupDraft();
    setOnboardingStep("backup");
  }, [backupImport, setOnboardingStep]);

  const chooseNewAccount = useCallback(() => {
    setOnboardError(null);
    setOnboardingStep("new");
  }, [setOnboardingStep]);

  const backToStart = useCallback(() => {
    setOnboardError(null);
    backupImport.resetBackupDraft();
    setOnboardingStep("start");
  }, [backupImport, setOnboardingStep]);

  const continueToPairing = useCallback(() => {
    setOnboardError(null);
    pairing.clearInlineError();
    setOnboardingStep("pairing");
  }, [pairing, setOnboardingStep]);

  const backToBackupSave = useCallback(() => {
    setOnboardError(null);
    pairing.clearInlineError();
    setOnboardingStep("backup-save");
  }, [pairing, setOnboardingStep]);

  const sendPairRequest = useCallback(async () => {
    setOnboardError(null);
    setIsSendingPairRequest(true);
    try {
      const sent = await pairing.sendPairRequest(partnerCodeInput);
      if (!sent) return;
      setPartnerCodeInput("");
      setPairRequestSent(true);
    } finally {
      setIsSendingPairRequest(false);
    }
  }, [pairing, partnerCodeInput]);

  const finishPairingOnboarding = useCallback(async () => {
    await backupDownload.finishOnboarding({ scrollToRequests: pairRequestSent });
  }, [backupDownload, pairRequestSent]);

  return {
    activeStepId: activeOnboardingStepId(onboardPath),
    backupDownload,
    backupImport,
    backToBackupSave,
    backToStart,
    chooseBackupImport,
    chooseNewAccount,
    continueToPairing,
    copyPairingCode,
    createAccount,
    finishPairingOnboarding,
    isBootstrappingAccount,
    isSendingPairRequest,
    nicknameDraft,
    onboardError,
    onboardPath,
    pairRequestSent,
    pairingInlineError: pairing.inlineError,
    pairingCode: identity?.code,
    partnerCodeInput,
    sendPairRequest,
    steps: onboardingSteps(onboardPath),
    clearPairingInlineError: pairing.clearInlineError,
    setPartnerCodeInput,
    updateNicknameDraft
  };
}
