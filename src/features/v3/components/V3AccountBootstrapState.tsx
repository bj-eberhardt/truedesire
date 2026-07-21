import { useEffect, useRef, useState } from "react";
import type { BootstrapAccountStatus } from "../../../app/state";

type V3AccountBootstrapStateProps = {
  status: Exclude<BootstrapAccountStatus, "ready">;
  onDeleteLocalAccount?: () => void;
  onRetry: () => void;
};

export function V3AccountBootstrapState({
  status,
  onDeleteLocalAccount,
  onRetry
}: V3AccountBootstrapStateProps) {
  const [visibleStatus, setVisibleStatus] = useState(status);
  const [transitionState, setTransitionState] = useState<"idle" | "leaving" | "entering">("idle");
  const leaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    if (status === visibleStatus) return undefined;

    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
    setTransitionState("leaving");
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      setVisibleStatus(status);
      setTransitionState("entering");
      enterTimerRef.current = window.setTimeout(() => {
        enterTimerRef.current = null;
        setTransitionState("idle");
      }, 120);
    }, 90);

    return () => {
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      leaveTimerRef.current = null;
      enterTimerRef.current = null;
    };
  }, [status, visibleStatus]);

  const displayStatus = visibleStatus;
  const isLoading = displayStatus === "loading";
  const title = isLoading
    ? "Seite wird geladen"
    : displayStatus === "unauthorized"
      ? "Kontoprüfung fehlgeschlagen"
      : "Temporäre Probleme";
  const text = isLoading
    ? "Bitte kurz warten. Wir prüfen, ob auf diesem Gerät bereits Kontodaten vorhanden sind."
    : displayStatus === "unauthorized"
      ? "Dieser lokale Account konnte auf dem Server nicht bestätigt werden. Du kannst es erneut versuchen oder die lokalen Accountdaten auf diesem Gerät entfernen."
      : "Der Server antwortet gerade nicht zuverlässig. Bitte versuche es gleich erneut.";

  return (
    <section
      className="v3-account-bootstrap"
      data-state={displayStatus}
      data-testid="account-loading-view"
      aria-live="polite"
    >
      <div className="v3-account-bootstrap-copy" data-transition-state={transitionState}>
        <p className="v3-account-bootstrap-kicker">TrueDesire</p>
        <h1>{title}</h1>
        <p className="hint">{text}</p>
      </div>

      <div
        className="v3-account-loader"
        data-testid="account-loading-bar"
        role="progressbar"
        aria-label="Seite wird geladen"
        aria-valuetext={isLoading ? "Wird geladen" : "Pausiert"}
      >
        <span className="v3-account-loader-rail" />
        <span className="v3-account-loader-fill" />
        <span className="v3-account-loader-vine" />
      </div>

      {!isLoading ? (
        <div className="v3-account-bootstrap-actions">
          <button
            type="button"
            className="primary v3-account-bootstrap-retry"
            data-testid="account-bootstrap-retry-button"
            onClick={onRetry}
          >
            Erneut versuchen
          </button>
          {displayStatus === "unauthorized" && onDeleteLocalAccount ? (
            <button
              type="button"
              className="secondary v3-account-bootstrap-delete-local"
              data-testid="account-bootstrap-delete-local-button"
              onClick={onDeleteLocalAccount}
            >
              Lokale Daten entfernen
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
