import "../../styles/v3/index.css";
import { useEffect, useState } from "react";
import { useFeedbackContext, usePairWorkspaceContext, useSessionContext } from "../../app/state";
import { V3Footer } from "./components/V3Footer";
import { V3Header } from "./components/V3Header";
import { V3Notice, V3RouteTransition } from "./components";
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
  const [visibleInlineNotice, setVisibleInlineNotice] = useState<string | null>(null);
  const [isInlineNoticeClosing, setIsInlineNoticeClosing] = useState(false);
  const workspace = usePairWorkspaceContext();
  const route = workspace.route.route;
  const routeMode = route.mode;
  const routeOnboard = route.onboard ?? "start";
  const routeKey = `${routeMode}:${route.pairId ?? ""}:${routeOnboard}`;

  useEffect(() => {
    if (feedback.inlineNotice) {
      setVisibleInlineNotice(feedback.inlineNotice);
      setIsInlineNoticeClosing(false);
      return undefined;
    }

    if (!visibleInlineNotice) return undefined;

    setIsInlineNoticeClosing(true);
    const closeTimer = window.setTimeout(() => {
      setVisibleInlineNotice(null);
      setIsInlineNoticeClosing(false);
    }, 220);

    return () => window.clearTimeout(closeTimer);
  }, [feedback.inlineNotice, visibleInlineNotice]);

  return (
    <div className="feature-shell v3-shell">
      <V3Header />
      <main className="v3">
        <div className="v3-container">
          {visibleInlineNotice ? (
            <V3Notice
              animationState={isInlineNoticeClosing ? "closing" : "open"}
              className="v3-notice-success"
              icon={<InfoIcon />}
              title="Kopiert"
              hint={visibleInlineNotice}
            />
          ) : null}
          <V3RouteTransition routeKey={routeKey}>
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
          </V3RouteTransition>
        </div>
      </main>
      <V3Footer />
    </div>
  );
}
