import { useCallback, useState } from "react";
import { goV3Onboarding, type V3Route } from "../../../../app/routes";
import {
  useAccountContext,
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
  const { importBackupText, exportBackupText } = useAccountContext();
  const { route } = usePairWorkspaceContext();
  const onboardPath: OnboardingPath = route.route.onboard ?? "start";
  const [onboardError, setOnboardError] = useState<string | null>(null);

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

  return {
    activeStepId: activeOnboardingStepId(onboardPath),
    backupDownload,
    backupImport,
    backToStart,
    chooseBackupImport,
    chooseNewAccount,
    createAccount,
    isBootstrappingAccount,
    nicknameDraft,
    onboardError,
    onboardPath,
    steps: onboardingSteps(onboardPath),
    updateNicknameDraft
  };
}
