export function CreateAccountStep({
  createAccount,
  isRegistering,
  nicknameDraft,
  onBack,
  updateNicknameDraft
}: {
  createAccount: (nicknameDraft: string) => Promise<void>;
  isRegistering: boolean;
  nicknameDraft: string;
  onBack: () => void;
  updateNicknameDraft: (value: string) => void;
}) {
  return (
    <>
      <p className="v3-onboard-question">Erstelle ein neues Konto</p>
      <p className="hint">
        Dein Nickname ist für Partner sichtbar, die deinen Pairing-Code kennen.
      </p>

      <div className="v3-onboard-form">
        <label className="field v3-field">
          <span>Nickname</span>
          <input
            data-testid="nickname-input"
            value={nicknameDraft}
            onChange={(e) => updateNicknameDraft(e.target.value)}
            placeholder="z.B. Alex"
            maxLength={30}
            required
          />
        </label>
        <p className="hint">
          Deine Account-Daten (inkl. Schlüssel) werden lokal auf diesem Gerät gespeichert. Fragen
          und Antworten werden auf deinem Gerät verschlüsselt und nur verschlüsselt auf dem Server
          gespeichert.
        </p>
        <div className="row">
          <button
            className="primary"
            data-testid="create-account-button"
            onClick={() => void createAccount(nicknameDraft)}
            disabled={!nicknameDraft.trim() || isRegistering}
          >
            Konto erstellen
          </button>
          <button
            className="secondary"
            data-testid="new-account-back-button"
            onClick={onBack}
            disabled={isRegistering}
          >
            Zurück
          </button>
        </div>
        <p className="hint">
          Du kannst danach jederzeit ein Backup erstellen und auf anderen Geräten importieren.
        </p>
      </div>
    </>
  );
}
