import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import type { PairingIncoming, PairingOutgoing, MyPairs } from "../../../hooks/usePairing";
import { OnboardingStepper } from "../components/OnboardingStepper";
import { goV3Onboarding } from "../../../app/routes";
import { V3Notice } from "../components/V3Notice";
import { InfoIcon } from "../components/icons/InfoIcon";
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from "../lib/backup";
import { toUserMessage } from "../lib/errors";

type HomePageProps = {
  isBootstrappingAccount: boolean;
  identity: { userId: string; nickname: string; code?: string | null } | null;
  nickname: string;
  onNicknameChange: (next: string) => void;
  onRegister: () => Promise<void>;
  onBootstrap: () => Promise<unknown>;
  onImportBackupText: (txt: string) => Promise<void>;
  onExportBackupText: () => Promise<string>;
  onboardingStep: "start" | "backup" | "new" | "backup-save";

  myPairs: MyPairs;
  pairingIncoming: PairingIncoming;
  pairingOutgoing: PairingOutgoing;
  pairingInlineError: string | null;
  onClearPairingInlineError: () => void;
  onRefreshPairingRequests: () => Promise<void>;
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>;
  onRespondPairing: (
    requestId: string,
    action: "accept" | "reject" | "cancel"
  ) => Promise<{ pairId?: string | null } | void>;
  onOpenPair: (pairId: string) => Promise<void>;
};

function CodeExchangeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-guide-icon" aria-hidden="true">
      <path
        d="M9 7H6.2C5 7 4 8 4 9.2v2.6C4 13 5 14 6.2 14H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 10h2.8c1.2 0 2.2 1 2.2 2.2v2.6C20 16 19 17 17.8 17H15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 4l-1.6 1.6M12 4l1.6 1.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 20l-1.6-1.6M12 20l1.6-1.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.3 10.2l1.7 1.8-1.7 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.7 13.8 15 12l1.7-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-chat-replay-icon" aria-hidden="true">
      <path
        d="M20 11a8 8 0 1 1-2.3-5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m10 8 6 4-6 4V8z" fill="currentColor" />
    </svg>
  );
}

function WelcomeTeaser() {
  const [demoRun, setDemoRun] = useState(0);

  return (
    <section className="v3-welcome-teaser" data-testid="welcome-teaser">
      <div className="v3-welcome-copy">
        <div className="v3-welcome-kicker">Privates Paarspiel</div>
        <h1>TrueDesire zeigt euch nur, wo ihr wirklich zusammenpasst.</h1>
        <p>
          Ihr beantwortet intime Fragen getrennt voneinander. Sichtbar werden am Ende nur Matches,
          also Wünsche, bei denen ihr beide offen seid. Keine Bloßstellung, keine Enttäuschung.
        </p>
        <div className="v3-privacy-grid" aria-label="Datenschutz bei TrueDesire">
          <div>
            <strong>Total anonym</strong>
            <span>Kein Klarname, keine E-Mail, kein öffentlicher Account.</span>
          </div>
          <div>
            <strong>Ende-zu-Ende privat</strong>
            <span>Der Server kennt weder Fragen noch Antworten im Klartext.</span>
          </div>
          <div>
            <strong>Nur in eurem Browser</strong>
            <span>Schlüssel und Account-Daten bleiben lokal bei euch.</span>
          </div>
        </div>
      </div>

      <div className="v3-chat-demo" aria-label="Beispiel für das Spielprinzip">
        <div className="v3-chat-shell">
          <div className="v3-chat-demo-head">
            <div>
              <div className="v3-chat-demo-kicker">Anonyme Runde</div>
              <div className="v3-chat-demo-title">Nur Matches werden sichtbar</div>
            </div>
            <button
              type="button"
              className="v3-chat-replay"
              aria-label="Animation erneut abspielen"
              title="Animation erneut abspielen"
              onClick={() => setDemoRun((run) => run + 1)}
            >
              <ReplayIcon />
            </button>
          </div>

          <div key={demoRun} className="v3-chat-thread">
            <div className="v3-chat-bubble v3-chat-question v3-chat-delay-1">
              Würdet ihr das zusammen ausprobieren?
            </div>

            <div className="v3-chat-secret v3-chat-delay-2">
              <div className="v3-chat-secret-avatar">A</div>
              <div className="v3-chat-secret-body">
                <span>Person A</span>
                <strong>Antwort gesendet</strong>
              </div>
              <div className="v3-chat-secret-answer" aria-label="Antwort verborgen">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="v3-chat-secret v3-chat-delay-3">
              <div className="v3-chat-secret-avatar">B</div>
              <div className="v3-chat-secret-body">
                <span>Person B</span>
                <strong>Antwort gesendet</strong>
              </div>
              <div className="v3-chat-secret-answer" aria-label="Antwort verborgen">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="v3-chat-match v3-chat-delay-4">
              <div className="v3-chat-match-label">Match</div>
              <div className="v3-chat-match-title">Ihr seid beide offen dafür.</div>
              <p>Die Einzelantworten bleiben privat. Sichtbar wird nur euer gemeinsamer Treffer.</p>
            </div>
          </div>
        </div>
        <p className="v3-chat-explain">
          Beide antworten getrennt. Wenn es passt, bekommt ihr nur das Match-Ergebnis zurück.
        </p>
      </div>
    </section>
  );
}

function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
  const el = ref.current;
  if (!el) return;
  // Prefer scrollIntoView so it works with scroll containers (not only window).
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  } catch {
    // fall back to window scrolling
  }
  const top = el.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function HomePage(props: HomePageProps) {
  const { onRefreshPairingRequests } = props;
  const onboardPath: "start" | "backup" | "new" | "backup-save" = props.onboardingStep ?? "start";
  const [backupText, setBackupText] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pairingRequestsLastCheckedAt, setPairingRequestsLastCheckedAt] = useState<number | null>(
    null
  );
  const [pairingRequestsNextCheckAt, setPairingRequestsNextCheckAt] = useState(
    () => Date.now() + 30_000
  );
  const [pairingRequestsNow, setPairingRequestsNow] = useState(() => Date.now());
  const [isRefreshingPairingRequests, setIsRefreshingPairingRequests] = useState(false);
  const pairingRequestsRefreshInFlightRef = useRef(false);

  const hasIdentity = !!props.identity?.userId;
  const pairingRequestsSecondsUntilRefresh = Math.max(
    0,
    Math.ceil((pairingRequestsNextCheckAt - pairingRequestsNow) / 1000)
  );
  const pairingRequestsLastCheckedLabel = pairingRequestsLastCheckedAt
    ? new Date(pairingRequestsLastCheckedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "noch nicht geprüft";

  const refreshPairingRequestsOnly = useCallback(async () => {
    if (!hasIdentity) return;
    if (pairingRequestsRefreshInFlightRef.current) return;
    pairingRequestsRefreshInFlightRef.current = true;
    setIsRefreshingPairingRequests(true);
    try {
      await onRefreshPairingRequests();
      setPairingRequestsLastCheckedAt(Date.now());
    } finally {
      pairingRequestsRefreshInFlightRef.current = false;
      setIsRefreshingPairingRequests(false);
      setPairingRequestsNextCheckAt(Date.now() + 30_000);
    }
  }, [hasIdentity, onRefreshPairingRequests]);

  useEffect(() => {
    if (!hasIdentity) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setPairingRequestsNow(now);
      if (now >= pairingRequestsNextCheckAt) void refreshPairingRequestsOnly();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasIdentity, pairingRequestsNextCheckAt, refreshPairingRequestsOnly]);
  function setOnboardingStep(step: "start" | "backup" | "new" | "backup-save") {
    goV3Onboarding(step);
  }

  const groupedRequests = useMemo(() => {
    const grouped = new Map<
      string,
      { nickname: string; code: string; incomingIds: string[]; outgoingIds: string[] }
    >();
    for (const r of props.pairingIncoming) {
      const key = `${r.from.code}|${r.from.nickname}`;
      const existing = grouped.get(key) ?? {
        nickname: r.from.nickname,
        code: r.from.code,
        incomingIds: [],
        outgoingIds: []
      };
      existing.incomingIds.push(r.id);
      grouped.set(key, existing);
    }
    for (const r of props.pairingOutgoing) {
      const key = `${r.to.code}|${r.to.nickname}`;
      const existing = grouped.get(key) ?? {
        nickname: r.to.nickname,
        code: r.to.code,
        incomingIds: [],
        outgoingIds: []
      };
      existing.outgoingIds.push(r.id);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[1].nickname.localeCompare(b[1].nickname, "de"))
      .map(([, row]) => row);
  }, [props.pairingIncoming, props.pairingOutgoing]);

  const requestsPanelRef = useRef<HTMLElement | null>(null);

  if (props.isBootstrappingAccount) {
    return (
      <section className="card v3-card v3-view" data-testid="account-loading-view">
        <h2>Konto wird geladen…</h2>
        <p className="hint">
          Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.
        </p>
      </section>
    );
  }

  const showOnboarding = !hasIdentity || onboardPath !== "start";

  if (showOnboarding) {
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
              onboardPath === "backup"
                ? "Backup importieren"
                : "Backup importieren oder neues Konto"
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

    async function importBackupText(txt: string) {
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
        await props.onImportBackupText(trimmed);
        setBackupText("");
        setBackupFile(null);
        setBackupFileName(null);
        if (backupFileInputRef.current) backupFileInputRef.current.value = "";
        setOnboardingStep("start");
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
        await importBackupText(txt);
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
        {!hasIdentity ? <WelcomeTeaser /> : null}
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
                    await importBackupText(backupText);
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
                    value={props.nickname}
                    onChange={(e) => props.onNicknameChange(e.target.value)}
                    placeholder="z.B. Alex"
                    maxLength={30}
                    required
                  />
                </label>
                <p className="hint">
                  Deine Account-Daten (inkl. Schlüssel) werden lokal auf diesem Gerät gespeichert.
                  Fragen und Antworten werden auf deinem Gerät verschlüsselt und nur verschlüsselt
                  auf dem Server gespeichert.
                </p>
                <div className="row">
                  <button
                    className="primary"
                    data-testid="create-account-button"
                    onClick={async () => {
                      const trimmed = props.nickname.trim();
                      if (!trimmed) {
                        setOnboardError("Bitte gib einen Nickname ein.");
                        return;
                      }
                      try {
                        setIsRegistering(true);
                        await props.onRegister();
                        setOnboardError(null);
                        const hydrated = (await props.onBootstrap()) as any;
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
                    disabled={!props.nickname.trim() || isRegistering}
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
                  Du kannst danach jederzeit ein Backup erstellen und auf anderen Geräten
                  importieren.
                </p>
              </div>
            </>
          ) : null}

          {onboardPath === "backup-save" ? (
            <>
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
                    try {
                      setOnboardError(null);
                      setIsDownloadingBackup(true);
                      const txt = await props.onExportBackupText();
                      const formatted = formatJsonMaybe(txt);
                      const filename = safeBackupFilename(props.identity?.code ?? "backup");
                      downloadTextFile({ filename, content: formatted });
                    } catch (e: unknown) {
                      setOnboardError(toUserMessage(e));
                    } finally {
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
                      const hydrated = (await props.onBootstrap()) as any;
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
                    setOnboardingStep("start");
                  }}
                >
                  Fertigstellen
                </button>
              </div>
              {isDownloadingBackup ? <div className="hint">Download wird vorbereitet…</div> : null}
            </>
          ) : null}

          {onboardError ? (
            <div className="inline-error" data-testid="onboarding-error">
              {onboardError}
            </div>
          ) : null}
        </section>
      </>
    );
  }

  const visiblePairs = props.myPairs.filter((p) => !p.partnerDeleted);
  const hasPairs = visiblePairs.length > 0;
  const hasRequests = groupedRequests.length > 0;

  return (
    <div className="v3-home-stack" data-testid="home-view">
      {hasRequests ? (
        <V3Notice
          icon={<InfoIcon />}
          title="Offene Verknüpfungen vorhanden"
          hint="Tippe hier, um die Anfragen anzusehen."
          onClick={() => scrollToSection(requestsPanelRef)}
        />
      ) : null}

      {hasPairs ? (
        <section className="card v3-card v3-panel" data-testid="partners-panel">
          <h2>Deine Partner</h2>
          <p className="hint">
            Du hast bereits folgende verknüpfte Partner. Tippe auf einen Partner, um die Fragen zu
            öffnen.
          </p>
          <div className="v3-pair-grid">
            {visiblePairs.map((p) => (
              <button
                key={p.id}
                className="v3-pair-card"
                data-testid="partner-card"
                data-pair-id={p.id}
                data-partner-name={p.partner?.nickname ?? p.id}
                onClick={async () => {
                  await props.onOpenPair(p.id);
                }}
              >
                <div className="v3-pair-card-main">
                  <ProfileAvatar name={p.partner?.nickname ?? "?"} />
                  <div>
                    <div className="v3-pair-card-name">{p.partner?.nickname ?? p.id}</div>
                    <div className="v3-pair-card-code mono">{p.partner?.code ?? "—"}</div>
                  </div>
                </div>
                <div
                  className={`pill mono status ${p.status === "active" ? "ok" : p.status === "ended" ? "ended" : "pending"}`}
                >
                  {p.partnerDeleted
                    ? "gelöscht"
                    : p.status === "active"
                      ? "aktiv"
                      : p.status === "ended"
                        ? "beendet"
                        : "ausstehend"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!hasPairs ? (
        <section className="card v3-card v3-panel v3-guide">
          <div className="v3-guide-head">
            <CodeExchangeIcon />
            <div className="v3-guide-text">
              <h2>So verknüpft ihr euch</h2>
              <p className="hint">
                Eine Person sendet eine Anfrage an den Pairing-Code des Partners. Sobald der Partner
                annimmt, seid ihr verknüpft.
              </p>
            </div>
          </div>
          <ol className="v3-guide-steps">
            <li>
              Frag deinen Partner nach seinem <strong>Pairing-Code</strong>.
            </li>
            <li>
              Teile deinem Partner deinen <strong>Pairing-Code</strong> (
              {props.identity?.code ?? "—"}) mit.
            </li>
            <li>
              Eine Person sendet die Anfrage. Der Partner nimmt sie an, dann wird die Verknüpfung
              aktiv.
            </li>
            <li>
              Wenn ihr verbunden seid, könnt ihr euch gegenseitig Fragen ausspielen und Antworten
              sehen.
            </li>
          </ol>
        </section>
      ) : null}

      <section className="card v3-card v3-panel" data-testid="pairing-panel">
        <h2>Mit Partner verknüpfen</h2>
        <p className="hint">
          Gib den Code deines Partners ein und sende die Anfrage. Sobald dein Partner sie annimmt,
          ist die Verknüpfung aktiv.
        </p>
        <div className="row v3-pairing-form">
          <input
            className="v3-partner-code-input"
            data-testid="partner-code-input"
            value={partnerCodeInput}
            onChange={(e) => {
              props.onClearPairingInlineError();
              setPartnerCodeInput(e.target.value);
            }}
            placeholder="Partner-Code"
          />
          <button
            className="primary"
            data-testid="send-pair-request-button"
            disabled={!partnerCodeInput.trim()}
            onClick={async () => {
              await props.onSendPairRequest(partnerCodeInput);
              setPartnerCodeInput("");
            }}
          >
            Anfrage senden
          </button>
        </div>
        {props.pairingInlineError ? (
          <div className="inline-error" data-testid="pairing-inline-error">
            {props.pairingInlineError}
          </div>
        ) : null}
      </section>

      <section
        ref={requestsPanelRef}
        className="card v3-card v3-panel"
        data-testid="pairing-requests-panel"
      >
        <div className="row v3-pairing-refresh-row">
          <h2>Offene Verknüpfungsanfragen</h2>
          <div className="v3-pairing-refresh-meta">
            <span className="hint">
              Nächste Prüfung in {pairingRequestsSecondsUntilRefresh}s · zuletzt:{" "}
              {pairingRequestsLastCheckedLabel}
            </span>
            <RefreshButton
              testId="pairing-requests-refresh-button"
              onClick={refreshPairingRequestsOnly}
              disabled={isRefreshingPairingRequests}
              title="Neue Pair-Anfragen prüfen"
            />
          </div>
        </div>
        {!groupedRequests.length ? (
          <div className="empty" data-testid="pairing-requests-empty">
            Keine offenen Anfragen.
          </div>
        ) : null}
        <div className="v3-request-list">
          {groupedRequests.map((row) => (
            <div
              className="v3-request"
              data-testid="pairing-request-row"
              data-request-code={row.code}
              data-request-name={row.nickname}
              key={`${row.code}|${row.nickname}`}
            >
              <div className="v3-request-head">
                <ProfileAvatar name={row.nickname} />
                <div className="v3-request-meta">
                  <div className="v3-request-name">{row.nickname}</div>
                  <div className="mono v3-request-code">{row.code}</div>
                </div>
              </div>
              <div className="v3-request-actions">
                {row.incomingIds.length ? (
                  <>
                    <button
                      className="secondary"
                      data-testid="pairing-request-accept-button"
                      onClick={async () => {
                        const result = await props.onRespondPairing(row.incomingIds[0], "accept");
                        if (result?.pairId) await props.onOpenPair(result.pairId);
                      }}
                    >
                      <span className="v3-action-ok">✓</span> Annehmen
                    </button>
                    <button
                      className="secondary"
                      data-testid="pairing-request-reject-button"
                      onClick={() => props.onRespondPairing(row.incomingIds[0], "reject")}
                    >
                      <span className="v3-action-bad">✕</span> Ablehnen
                    </button>
                  </>
                ) : null}
                {row.outgoingIds.length ? (
                  <button
                    className="secondary"
                    data-testid="pairing-request-cancel-button"
                    onClick={() => props.onRespondPairing(row.outgoingIds[0], "cancel")}
                  >
                    Zurückziehen
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
