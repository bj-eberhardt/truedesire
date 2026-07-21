import { goV3Onboarding } from "../../../app/routes";

export function AccountDeletedPage() {
  return (
    <section className="card v3-card v3-view v3-account-deleted" data-testid="account-deleted-view">
      <div className="v3-account-deleted-art" aria-hidden="true">
        <svg viewBox="0 0 220 150" role="img">
          <path
            d="M42 113c-16-14-18-39-4-57 13-17 39-20 57-7 18-13 44-10 57 7 14 18 12 43-4 57l-53 25-53-25Z"
            fill="currentColor"
            opacity="0.12"
          />
          <path
            d="M64 50c10 0 18 5 24 14 6-9 14-14 24-14 16 0 29 13 29 30 0 25-39 46-53 53-14-7-53-28-53-53 0-17 13-30 29-30Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <path
            d="M142 38h31M157.5 22.5v31"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="7"
            opacity="0.72"
          />
          <path
            d="M147 101c8 5 17 9 27 11M156 83c7 1 14 4 20 8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="5"
            opacity="0.35"
          />
        </svg>
      </div>

      <div className="v3-account-deleted-copy">
        <div className="v3-welcome-kicker">Account entfernt</div>
        <h1>Schade</h1>
        <p>
          Dein Account ist auf diesem Gerät nicht mehr aktiv. Du kannst neu anfangen oder ein
          vorhandenes Backup einspielen.
        </p>
      </div>

      <div className="v3-account-deleted-actions">
        <button
          type="button"
          className="primary"
          data-testid="delete-success-new-account-button"
          onClick={() => goV3Onboarding("new")}
        >
          Neu anmelden
        </button>
        <button
          type="button"
          className="secondary"
          data-testid="delete-success-import-backup-button"
          onClick={() => goV3Onboarding("backup")}
        >
          Backup einspielen
        </button>
      </div>
    </section>
  );
}
