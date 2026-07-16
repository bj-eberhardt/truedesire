import { useSessionContext } from "../../../app/state";
import { V3LoadingState } from "../components/V3PageState";
import { WelcomeTeaser } from "../components/WelcomeTeaser";

export function HomePage() {
  const { isBootstrappingAccount } = useSessionContext();

  if (isBootstrappingAccount) {
    return (
      <V3LoadingState testId="account-loading-view" title="Konto wird geladen…" framed>
        Bitte kurz warten. Wir prüfen, ob bereits Kontodaten auf diesem Gerät vorhanden sind.
      </V3LoadingState>
    );
  }

  return <WelcomeTeaser />;
}
