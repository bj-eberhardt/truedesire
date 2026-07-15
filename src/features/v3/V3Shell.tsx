import "../../styles/v3.css";
import { useFeedbackContext, usePairWorkspaceContext, useSessionContext } from "../../app/state";
import { V3Footer } from "./components/V3Footer";
import { V3Header } from "./components/V3Header";
import { V3Notice } from "./components/V3Notice";
import { InfoIcon } from "./components/icons/InfoIcon";
import { AccountHomePage } from "./pages/AccountHome";
import { AskPage } from "./pages/Ask";
import { BackupPage } from "./pages/Backup";
import { HomePage } from "./pages/Home";
import { PairPage } from "./pages/Pair";
import { PlayedPage } from "./pages/Played";
import { WelcomePage } from "./pages/Welcome";

export function V3Shell() {
  const { identity } = useSessionContext();
  const feedback = useFeedbackContext();
  const workspace = usePairWorkspaceContext();
  const route = workspace.route.route;
  const routeMode = route.mode;
  const routeOnboard = route.onboard ?? "start";

  return (
    <div className="feature-shell v3-shell">
      <V3Header />
      <main className="v3">
        <div className="v3-container">
          {feedback.inlineNotice ? (
            <V3Notice
              className="v3-notice-success"
              icon={<InfoIcon />}
              title="Kopiert"
              hint={feedback.inlineNotice}
            />
          ) : null}
          {routeMode === "pair" || routeMode === "pairMatches" || routeMode === "pairSettings" ? (
            <PairPage />
          ) : routeMode === "ask" ? (
            <AskPage />
          ) : routeMode === "played" ? (
            <PlayedPage />
          ) : routeMode === "backup" ? (
            <BackupPage />
          ) : routeMode === "welcome" || routeOnboard !== "start" ? (
            <WelcomePage />
          ) : !identity?.userId ? (
            <HomePage />
          ) : (
            <AccountHomePage />
          )}
        </div>
      </main>
      <V3Footer />
    </div>
  );
}
