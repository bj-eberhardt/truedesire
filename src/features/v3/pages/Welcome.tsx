import { useState } from "react";
import { goV3Onboarding, type V3Route } from "../../../app/routes";
import { useAccountContext, usePairWorkspaceContext, useSessionContext } from "../../../app/state";
import { OnboardingStepper } from "../components/OnboardingStepper";
import { V3LoadingState, V3PageError } from "../components/V3PageState";
import { BackupImportStep } from "./welcome/BackupImportStep";
import { BackupSaveStep } from "./welcome/BackupSaveStep";
import { CreateAccountStep } from "./welcome/CreateAccountStep";
import { OnboardingStartStep } from "./welcome/OnboardingStartStep";
import { activeOnboardingStepId, onboardingSteps } from "./welcome/onboardingSteps";
import { useBackupDownloadFlow } from "./welcome/useBackupDownloadFlow";
import { useBackupImportDraft } from "./welcome/useBackupImportDraft";
import { useCreateAccountFlow } from "./welcome/useCreateAccountFlow";

export function WelcomePage() {
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
  const onboardPath = route.route.onboard ?? "start";
  const [onboardError, setOnboardError] = useState<string | null>(null);

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

  if (isBootstrappingAccount) {
    return (
      <V3LoadingState testId="account-loading-view" title="Konto wird geladen..." framed>
        Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.
      </V3LoadingState>
    );
  }

  function setOnboardingStep(step: NonNullable<V3Route["onboard"]>) {
    goV3Onboarding(step);
  }

  function chooseBackupImport() {
    setOnboardError(null);
    backupImport.resetBackupDraft();
    setOnboardingStep("backup");
  }

  function chooseNewAccount() {
    setOnboardError(null);
    setOnboardingStep("new");
  }

  function backToStart() {
    setOnboardError(null);
    backupImport.resetBackupDraft();
    setOnboardingStep("start");
  }

  return (
    <section className="card v3-card v3-view" data-testid="onboarding-view">
      <h2 className="v3-welcome-title">Willkommen</h2>
      <OnboardingStepper
        steps={onboardingSteps(onboardPath)}
        activeStepId={activeOnboardingStepId(onboardPath)}
      />
      <div className="divider v3-welcome-divider" />

      {onboardPath === "start" ? (
        <OnboardingStartStep
          onChooseBackup={chooseBackupImport}
          onChooseNewAccount={chooseNewAccount}
        />
      ) : null}

      {onboardPath === "backup" ? (
        <BackupImportStep
          backupFileInputRef={backupImport.backupFileInputRef}
          backupFileName={backupImport.backupFileName}
          backupText={backupImport.backupText}
          clearBackupFileSelection={backupImport.clearBackupFileSelection}
          onBack={backToStart}
          selectBackupFile={backupImport.selectBackupFile}
          setBackupText={backupImport.setBackupText}
          submitBackupImport={backupImport.submitBackupImport}
        />
      ) : null}

      {onboardPath === "new" ? (
        <CreateAccountStep
          createAccount={createAccount.createAccount}
          isRegistering={createAccount.isRegistering}
          nicknameDraft={nicknameDraft}
          onBack={backToStart}
          updateNicknameDraft={updateNicknameDraft}
        />
      ) : null}

      {onboardPath === "backup-save" ? (
        <BackupSaveStep
          downloadBackup={backupDownload.downloadBackup}
          finishOnboarding={backupDownload.finishOnboarding}
          isDownloadingBackup={backupDownload.isDownloadingBackup}
        />
      ) : null}

      {onboardError ? <V3PageError testId="onboarding-error">{onboardError}</V3PageError> : null}
    </section>
  );
}
