import { OnboardingStepper } from "../components/OnboardingStepper";
import { V3LoadingState, V3PageError } from "../components";
import { BackupImportStep } from "./welcome/BackupImportStep";
import { BackupSaveStep } from "./welcome/BackupSaveStep";
import { CreateAccountStep } from "./welcome/CreateAccountStep";
import { OnboardingStartStep } from "./welcome/OnboardingStartStep";
import { useWelcomeOnboardingModel } from "./welcome/useWelcomeOnboardingModel";

export function WelcomePage() {
  const onboarding = useWelcomeOnboardingModel();

  if (onboarding.isBootstrappingAccount) {
    return (
      <V3LoadingState testId="account-loading-view" title="Konto wird geladen..." framed>
        Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.
      </V3LoadingState>
    );
  }

  return (
    <section className="card v3-card v3-view" data-testid="onboarding-view">
      <h2 className="v3-welcome-title">Willkommen</h2>
      <OnboardingStepper steps={onboarding.steps} activeStepId={onboarding.activeStepId} />
      <div className="divider v3-welcome-divider" />

      {onboarding.onboardPath === "start" ? (
        <OnboardingStartStep
          onChooseBackup={onboarding.chooseBackupImport}
          onChooseNewAccount={onboarding.chooseNewAccount}
        />
      ) : null}

      {onboarding.onboardPath === "backup" ? (
        <BackupImportStep
          backupFileInputRef={onboarding.backupImport.backupFileInputRef}
          backupFileName={onboarding.backupImport.backupFileName}
          backupText={onboarding.backupImport.backupText}
          clearBackupFileSelection={onboarding.backupImport.clearBackupFileSelection}
          onBack={onboarding.backToStart}
          selectBackupFile={onboarding.backupImport.selectBackupFile}
          setBackupText={onboarding.backupImport.setBackupText}
          submitBackupImport={onboarding.backupImport.submitBackupImport}
        />
      ) : null}

      {onboarding.onboardPath === "new" ? (
        <CreateAccountStep
          createAccount={onboarding.createAccount.createAccount}
          isRegistering={onboarding.createAccount.isRegistering}
          nicknameDraft={onboarding.nicknameDraft}
          onBack={onboarding.backToStart}
          updateNicknameDraft={onboarding.updateNicknameDraft}
        />
      ) : null}

      {onboarding.onboardPath === "backup-save" ? (
        <BackupSaveStep
          downloadBackup={onboarding.backupDownload.downloadBackup}
          finishOnboarding={onboarding.backupDownload.finishOnboarding}
          isDownloadingBackup={onboarding.backupDownload.isDownloadingBackup}
        />
      ) : null}

      {onboarding.onboardError ? (
        <V3PageError testId="onboarding-error">{onboarding.onboardError}</V3PageError>
      ) : null}
    </section>
  );
}
