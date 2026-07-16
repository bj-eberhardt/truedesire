export function OnboardingStartStep({
  onChooseBackup,
  onChooseNewAccount
}: {
  onChooseBackup: () => void;
  onChooseNewAccount: () => void;
}) {
  return (
    <>
      <p className="v3-onboard-question">Hast du bereits ein Backup von deinem Konto?</p>
      <div className="v3-onboard-choice-row">
        <button
          className="secondary v3-onboard-choice"
          data-testid="onboarding-has-backup-button"
          onClick={onChooseBackup}
        >
          Ja, ich habe ein Backup
        </button>
        <button
          className="secondary v3-onboard-choice"
          data-testid="onboarding-new-account-button"
          onClick={onChooseNewAccount}
        >
          Nein, neues Konto
        </button>
      </div>
    </>
  );
}
