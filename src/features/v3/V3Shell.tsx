import "../../styles/v3/index.css";
import { useEffect, useState } from "react";
import {
  useAccountContext,
  useFeedbackContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../app/state";
import { V3Footer } from "./components/V3Footer";
import { V3Header } from "./components/V3Header";
import { V3AccountBootstrapState, V3Notice, V3RouteTransition } from "./components";
import { InfoIcon } from "./components/icons/InfoIcon";
import { AccountHomePage } from "./pages/AccountHome";
import { AccountDeletedPage } from "./pages/AccountDeleted";
import { AskPage } from "./pages/Ask";
import { BackupPage } from "./pages/Backup";
import { HomePage } from "./pages/Home";
import { PairPage } from "./pages/Pair";
import { PlayedPage } from "./pages/Played";
import { WelcomePage } from "./pages/Welcome";

export function V3Shell() {
  const { bootstrapAccount, bootstrapAccountStatus, identity } = useSessionContext();
  const account = useAccountContext();
  const feedback = useFeedbackContext();
  const [visibleInlineNotice, setVisibleInlineNotice] = useState<string | null>(null);
  const [isInlineNoticeClosing, setIsInlineNoticeClosing] = useState(false);
  const workspace = usePairWorkspaceContext();
  const route = workspace.route.route;
  const routeMode = route.mode;
  const routeOnboard = route.onboard ?? "start";
  const isBootstrappingGate = bootstrapAccountStatus !== "ready";
  const routeKey = isBootstrappingGate
    ? "account-bootstrap"
    : routeMode === "pair" || routeMode === "pairMatches" || routeMode === "pairSettings"
      ? `pair:${route.pairId ?? ""}`
      : routeMode === "welcome" || routeOnboard !== "start"
        ? "welcome"
        : routeMode === "home"
          ? identity?.userId
            ? "account-home"
            : "home"
          : `${routeMode}:${route.pairId ?? ""}`;

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

  async function deleteLocalAccountAndReload() {
    await account.deleteLocalAccount();
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div className="feature-shell v3-shell">
      <V3Header hideProfileMenu={isBootstrappingGate} />
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
            {isBootstrappingGate ? (
              <V3AccountBootstrapState
                status={bootstrapAccountStatus}
                onDeleteLocalAccount={() => void deleteLocalAccountAndReload()}
                onRetry={() => void bootstrapAccount()}
              />
            ) : routeMode === "pair" ||
              routeMode === "pairMatches" ||
              routeMode === "pairSettings" ? (
              <PairPage />
            ) : routeMode === "accountDeleted" ? (
              <AccountDeletedPage />
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
