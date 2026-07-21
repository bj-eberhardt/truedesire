import { V3LoadingState } from "../components";
import { OnboardingAssistantFrame } from "./welcome/OnboardingAssistantFrame";
import { BackupImportStep } from "./welcome/BackupImportStep";
import { BackupSaveStep } from "./welcome/BackupSaveStep";
import { CreateAccountStep } from "./welcome/CreateAccountStep";
import { OnboardingStartStep } from "./welcome/OnboardingStartStep";
import { OnboardingPairingStep } from "./welcome/OnboardingPairingStep";
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
    <OnboardingAssistantFrame
      activeStepId={onboarding.activeStepId}
      error={onboarding.onboardError}
      steps={onboarding.steps}
      leftAction={
        onboarding.onboardPath === "pairing" ? (
          <button
            className="secondary"
            data-testid="onboarding-pairing-back-button"
            onClick={onboarding.backToBackupSave}
          >
            Zurück
          </button>
        ) : null
      }
      rightAction={
        onboarding.onboardPath === "backup-save" ? (
          <button
            className="primary"
            data-testid="onboarding-backup-next-button"
            onClick={onboarding.continueToPairing}
          >
            Weiter
          </button>
        ) : onboarding.onboardPath === "pairing" ? (
          <button
            className="primary"
            data-testid="onboarding-finish-button"
            onClick={() => void onboarding.finishPairingOnboarding()}
          >
            Weiter zur Home-Seite
          </button>
        ) : null
      }
    >
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
          importSuccessVisible={onboarding.backupImport.importSuccessVisible}
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
          isDownloadingBackup={onboarding.backupDownload.isDownloadingBackup}
        />
      ) : null}

      {onboarding.onboardPath === "pairing" ? (
        <OnboardingPairingStep
          clearInlineError={onboarding.clearPairingInlineError}
          copyPairingCode={onboarding.copyPairingCode}
          inlineError={onboarding.pairingInlineError}
          isSendingPairRequest={onboarding.isSendingPairRequest}
          partnerCodeInput={onboarding.partnerCodeInput}
          pairingCode={onboarding.pairingCode}
          requestSent={onboarding.pairRequestSent}
          sendPairRequest={onboarding.sendPairRequest}
          setPartnerCodeInput={onboarding.setPartnerCodeInput}
        />
      ) : null}
    </OnboardingAssistantFrame>
  );
}
