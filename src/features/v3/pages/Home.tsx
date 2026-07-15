import { WelcomeTeaser } from "../components/WelcomeTeaser";

type HomePageProps = {
  isBootstrappingAccount: boolean;
};

export function HomePage(props: HomePageProps) {
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

  return <WelcomeTeaser />;
}
