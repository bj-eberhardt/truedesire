import { useEffect } from "react";

export function BootstrapSplash() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.getElementById("boot-fallback")?.remove();
    }
  }, []);

  return (
    <div className="boot-shell" data-testid="bootstrap-splash">
      <BootHeader />
      <main className="boot-main">
        <section className="boot-card" aria-live="polite">
          <div>
            <p className="boot-kicker">TrueDesire</p>
            <h1>Seite wird geladen</h1>
          </div>
          <p>Bitte kurz warten. Wir bereiten die Kontoprüfung vor.</p>
          <div className="boot-loader" role="progressbar" aria-label="Seite wird geladen">
            <span className="boot-loader-rail" />
            <span className="boot-loader-fill" />
            <span className="boot-loader-vine" />
          </div>
        </section>
      </main>
    </div>
  );
}

function BootHeader() {
  return (
    <header className="boot-header">
      <div className="boot-brand" aria-label="TrueDesire">
        <svg className="boot-logo" viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M20 12c5 0 9 3 12 8 3-5 7-8 12-8 9 0 16 7 16 17 0 15-22 27-28 30C26 56 4 44 4 29 4 19 11 12 20 12Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
          <path
            d="M20 31l8 8 17-19"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        </svg>
        <span className="boot-brand-text">
          <span className="boot-brand-title">TrueDesire</span>
          <span className="boot-brand-subtitle">Wahre Wünsche</span>
        </span>
      </div>
    </header>
  );
}
