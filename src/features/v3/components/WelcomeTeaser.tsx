import { useEffect, useRef, useState } from "react";
import { goV3Welcome } from "../../../app/routes";

function ReplayIcon() {
  return (
    <svg viewBox="0 0 48 48" className="v3-chat-replay-icon" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="currentColor" opacity="0.13" />
      <path
        d="M33.7 16.9A12 12 0 1 0 36 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M34 11v8h-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrivacyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-feature-icon" aria-hidden="true">
      <path
        d="M3.5 12c1.8-3.4 4.7-5.2 8.5-5.2s6.7 1.8 8.5 5.2c-1.8 3.4-4.7 5.2-8.5 5.2S5.3 15.4 3.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.7 12a2.3 2.3 0 0 1 3.1-2.2M14.2 13.5A2.3 2.3 0 0 1 10.5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 19.5 19.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-feature-icon" aria-hidden="true">
      <path
        d="M12 3 5.5 5.5v5.1c0 4 2.6 7.6 6.5 9.4 3.9-1.8 6.5-5.4 6.5-9.4V5.5L12 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrowserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="v3-feature-icon" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M4 9h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 15.5h3.5M14.5 15.5H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 7.1h.01M10 7.1h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WelcomeTeaser() {
  const [demoRun, setDemoRun] = useState(0);
  const [chatInView, setChatInView] = useState(false);
  const chatShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = chatShellRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setChatInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setChatInView(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="v3-welcome-teaser" data-testid="welcome-teaser">
      <div className="v3-welcome-copy">
        <div className="v3-welcome-kicker">Privates Paarspiel</div>
        <h1 className="v3-welcome-headline">
          <span className="v3-welcome-brand">TrueDesire</span>
          <span className="v3-welcome-claim">zeigt euch nur, wo ihr wirklich zusammenpasst.</span>
        </h1>
        <p>
          Ihr beantwortet intime Fragen getrennt voneinander. Sichtbar werden am Ende nur Matches,
          also Wünsche, bei denen ihr beide offen seid.
          <strong className="v3-welcome-emphasis">Keine Bloßstellung, keine Enttäuschung.</strong>
        </p>
        <div className="v3-privacy-grid" aria-label="Datenschutz bei TrueDesire">
          <div>
            <PrivacyIcon />
            <strong>Total anonym</strong>
            <span className="v3-feature-copy">
              Kein Klarname, keine E-Mail, kein öffentlicher Account.
            </span>
          </div>
          <div>
            <ShieldIcon />
            <strong>Ende-zu-Ende privat</strong>
            <span className="v3-feature-copy">
              Der Server kennt weder Fragen noch Antworten im Klartext.
            </span>
          </div>
          <div>
            <BrowserIcon />
            <strong>Nur in eurem Browser</strong>
            <span className="v3-feature-copy">
              Schlüssel und Account-Daten bleiben lokal bei euch.
            </span>
          </div>
        </div>
      </div>

      <div className="v3-chat-demo" aria-label="Beispiel für das Spielprinzip">
        <div ref={chatShellRef} className="v3-chat-shell">
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
              onClick={() => {
                setChatInView(true);
                setDemoRun((run) => run + 1);
              }}
            >
              <ReplayIcon />
            </button>
          </div>

          <div
            key={demoRun}
            className="v3-chat-thread"
            data-animate={chatInView ? "true" : "false"}
          >
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
        <button
          type="button"
          className="primary v3-welcome-start-button"
          data-testid="welcome-start-button"
          onClick={() => goV3Welcome()}
        >
          Starte jetzt!
        </button>
      </div>
    </section>
  );
}
