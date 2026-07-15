import { useRef, useState } from "react";
import { goV3, goV3Onboarding, type V3Route } from "../../../app/routes";
import { useAccountContext, usePairWorkspaceContext, useSessionContext } from "../../../app/state";
import { OnboardingStepper } from "../components/OnboardingStepper";
import { V3LoadingState, V3PageError } from "../components/V3PageState";
import { V3Notice } from "../components/V3Notice";
import { InfoIcon } from "../components/icons/InfoIcon";
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from "../lib/backup";
import { toUserMessage } from "../lib/errors";

const MIN_BACKUP_DOWNLOAD_FEEDBACK_MS = 2_000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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
  const [backupText, setBackupText] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  if (isBootstrappingAccount) {
    return (
      <V3LoadingState testId="account-loading-view" title="Konto wird geladen…" framed>
        Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.
      </V3LoadingState>
    );
  }

  function setOnboardingStep(step: NonNullable<V3Route["onboard"]>) {
    goV3Onboarding(step);
  }

  const isNewFlow = onboardPath === "new" || onboardPath === "backup-save";

  const steps = isNewFlow
    ? [
        { id: "choose", title: "Start", subtitle: "Backup importieren oder neues Konto" },
        { id: "new", title: "Neues Konto", subtitle: "Nickname festlegen" },
        { id: "backup", title: "Backup", subtitle: "Optional herunterladen" },
        { id: "ready", title: "Fertig", subtitle: "Partner verknüpfen und loslegen" }
      ]
    : [
        { id: "choose", title: "Start", subtitle: "Backup importieren oder neues Konto" },
        {
          id: "setup",
          title: onboardPath === "backup" ? "Backup importieren" : "Einrichten",
          subtitle:
            onboardPath === "backup" ? "Backup importieren" : "Backup importieren oder neues Konto"
        },
        { id: "ready", title: "Fertig", subtitle: "Partner verknüpfen und loslegen" }
      ];

  const activeStepId =
    onboardPath === "start"
      ? "choose"
      : onboardPath === "backup"
        ? "setup"
        : onboardPath === "new"
          ? "new"
          : onboardPath === "backup-save"
            ? "backup"
            : "setup";

  async function importBackupDraft(txt: string) {
    const trimmed = txt.trim();
    if (!trimmed) {
      setOnboardError("Bitte lade eine Backup-Datei hoch oder füge dein Backup-JSON ein.");
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch {
      setOnboardError("Der eingefügte Text ist kein valides Backup (ungültiges JSON).");
      return;
    }
    try {
      setOnboardError(null);
      await importBackupText(trimmed);
      setBackupText("");
      setBackupFile(null);
      setBackupFileName(null);
      if (backupFileInputRef.current) backupFileInputRef.current.value = "";
      goV3();
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    }
  }

  async function importBackupFile(file: File) {
    try {
      const txt = (await file.text()).trim();
      if (!txt) {
        setOnboardError("Die Datei ist leer und keine valide Backup-Datei.");
        return;
      }
      try {
        JSON.parse(txt);
      } catch {
        setOnboardError(
          "Die Datei konnte nicht gelesen werden oder ist keine valide Backup-Datei."
        );
        return;
      }
      await importBackupDraft(txt);
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    }
  }

  function clearBackupFileSelection() {
    setBackupFile(null);
    setBackupFileName(null);
    if (backupFileInputRef.current) backupFileInputRef.current.value = "";
  }

  return (
    <>
      <section className="card v3-card v3-view" data-testid="onboarding-view">
        <h2 className="v3-welcome-title">Willkommen</h2>
        <OnboardingStepper steps={steps} activeStepId={activeStepId} />
        <div className="divider v3-welcome-divider" />
        {onboardPath === "start" ? (
          <>
            <p className="v3-onboard-question">Hast du bereits ein Backup von deinem Konto?</p>
            <div className="v3-onboard-choice-row">
              <button
                className="secondary v3-onboard-choice"
                data-testid="onboarding-has-backup-button"
                onClick={() => {
                  setOnboardError(null);
                  setBackupText("");
                  clearBackupFileSelection();
                  setOnboardingStep("backup");
                }}
              >
                Ja, ich habe ein Backup
              </button>
              <button
                className="secondary v3-onboard-choice"
                data-testid="onboarding-new-account-button"
                onClick={() => {
                  setOnboardError(null);
                  setOnboardingStep("new");
                }}
              >
                Nein, neues Konto
              </button>
            </div>
          </>
        ) : null}

        {onboardPath === "backup" ? (
          <>
            <p className="v3-onboard-question">
              Lade ein bestehendes Backup als Datei hoch, oder füge deinen Backup-Text in die
              Textbox ein.
            </p>

            <div className="v3-import-panel">
              <div className="v3-import-col">
                <div className="v3-import-heading">Backup via Datei</div>
                <input
                  ref={backupFileInputRef}
                  className="v3-import-file-input"
                  data-testid="backup-file-input"
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    if (!file) {
                      clearBackupFileSelection();
                      return;
                    }
                    setOnboardError(null);
                    setBackupFile(file);
                    setBackupFileName(file.name);
                  }}
                />
                <div className="v3-import-file-row">
                  <button
                    type="button"
                    className="secondary"
                    data-testid="backup-file-select-button"
                    onClick={() => backupFileInputRef.current?.click()}
                  >
                    Backup-Datei auswählen
                  </button>
                  {backupFileName ? (
                    <button
                      type="button"
                      className="secondary"
                      data-testid="backup-file-clear-button"
                      onClick={() => {
                        setOnboardError(null);
                        clearBackupFileSelection();
                      }}
                    >
                      Auswahl löschen
                    </button>
                  ) : null}
                </div>
                {backupFileName ? (
                  <div className="hint">Ausgewählt: {backupFileName}</div>
                ) : (
                  <div className="hint">Wähle die Backup .json Datei aus</div>
                )}
              </div>

              <div className="v3-import-col">
                <div className="v3-import-heading">Backup über Text</div>
                <label className="field v3-field">
                  <textarea
                    data-testid="backup-import-textarea"
                    value={backupText}
                    onChange={(e) => setBackupText(e.target.value)}
                    placeholder='{"version": ...}'
                    rows={10}
                  />
                </label>
                <div className="hint">Kopiere dein Backup-JSON-Text in die Textbox.</div>
              </div>
            </div>

            <div className="row">
              <button
                className="primary"
                data-testid="backup-import-submit-button"
                onClick={async () => {
                  if (backupFile) {
                    await importBackupFile(backupFile);
                    return;
                  }
                  await importBackupDraft(backupText);
                }}
              >
                Importieren und prüfen
              </button>
              <button
                type="button"
                className="secondary"
                data-testid="backup-import-back-button"
                onClick={() => {
                  setOnboardError(null);
                  setBackupText("");
                  clearBackupFileSelection();
                  setOnboardingStep("start");
                }}
              >
                Zurück
              </button>
            </div>
          </>
        ) : null}

        {onboardPath === "new" ? (
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
                Deine Account-Daten (inkl. Schlüssel) werden lokal auf diesem Gerät gespeichert.
                Fragen und Antworten werden auf deinem Gerät verschlüsselt und nur verschlüsselt auf
                dem Server gespeichert.
              </p>
              <div className="row">
                <button
                  className="primary"
                  data-testid="create-account-button"
                  onClick={async () => {
                    const trimmed = nicknameDraft.trim();
                    if (!trimmed) {
                      setOnboardError("Bitte gib einen Nickname ein.");
                      return;
                    }
                    try {
                      setIsRegistering(true);
                      await registerAccount(trimmed);
                      setOnboardError(null);
                      const hydrated = await bootstrapAccount();
                      if (!hydrated?.userId) {
                        setOnboardError(
                          "Konto wurde erstellt, konnte aber noch nicht geladen werden. Bitte erneut versuchen."
                        );
                        return;
                      }
                      setOnboardingStep("backup-save");
                    } catch (e: unknown) {
                      setOnboardError(toUserMessage(e));
                    } finally {
                      setIsRegistering(false);
                    }
                  }}
                  disabled={!nicknameDraft.trim() || isRegistering}
                >
                  Konto erstellen
                </button>
                <button
                  className="secondary"
                  data-testid="new-account-back-button"
                  onClick={() => {
                    setOnboardError(null);
                    setOnboardingStep("start");
                  }}
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
        ) : null}

        {onboardPath === "backup-save" ? (
          <>
            <V3Notice
              className="v3-notice-success v3-onboard-success"
              icon={<InfoIcon />}
              title="Account angelegt"
              hint="Dein Konto wurde erfolgreich erstellt."
              testId="account-created-success"
            />
            <p className="v3-onboard-question">Backup anlegen (optional)</p>
            <p className="hint">
              Du kannst jetzt direkt ein Backup als Datei herunterladen. So kannst du dein Konto
              später auf einem anderen Gerät wiederherstellen.
            </p>

            <div className="row">
              <button
                className="secondary"
                data-testid="onboarding-download-backup-button"
                disabled={isDownloadingBackup}
                onClick={async () => {
                  const startedAt = window.performance.now();
                  try {
                    setOnboardError(null);
                    setIsDownloadingBackup(true);
                    const txt = await exportBackupText();
                    const formatted = formatJsonMaybe(txt);
                    const filename = safeBackupFilename(identity?.code ?? "backup");
                    downloadTextFile({ filename, content: formatted });
                  } catch (e: unknown) {
                    setOnboardError(toUserMessage(e));
                  } finally {
                    const elapsed = window.performance.now() - startedAt;
                    if (elapsed < MIN_BACKUP_DOWNLOAD_FEEDBACK_MS) {
                      await wait(MIN_BACKUP_DOWNLOAD_FEEDBACK_MS - elapsed);
                    }
                    setIsDownloadingBackup(false);
                  }
                }}
              >
                Backup herunterladen
              </button>
              <button
                className="primary"
                data-testid="onboarding-finish-button"
                onClick={async () => {
                  setOnboardError(null);
                  try {
                    const hydrated = await bootstrapAccount();
                    if (!hydrated?.userId) {
                      setOnboardError(
                        "Konto konnte nicht geladen werden. Bitte kurz warten und erneut versuchen."
                      );
                      return;
                    }
                  } catch (e: unknown) {
                    setOnboardError(e instanceof Error ? e.message : String(e));
                    return;
                  }
                  goV3();
                }}
              >
                Fertigstellen
              </button>
            </div>
            {isDownloadingBackup ? (
              <div className="v3-notice v3-notice-info v3-notice-without-icon small" role="status">
                <div className="v3-notice-text">
                  <strong>Download wird vorbereitet…</strong>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {onboardError ? (
          <V3PageError testId="onboarding-error">{onboardError}</V3PageError>
        ) : null}
      </section>
    </>
  );
}
