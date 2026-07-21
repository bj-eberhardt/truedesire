import "../../styles/v3/index.css";
import { lazy, Suspense, useEffect, useState } from "react";
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

const AccountHomePage = lazy(() =>
  import("./pages/AccountHome").then((module) => ({ default: module.AccountHomePage }))
);
const AccountDeletedPage = lazy(() =>
  import("./pages/AccountDeleted").then((module) => ({ default: module.AccountDeletedPage }))
);
const AskPage = lazy(() => import("./pages/Ask").then((module) => ({ default: module.AskPage })));
const BackupPage = lazy(() =>
  import("./pages/Backup").then((module) => ({ default: module.BackupPage }))
);
const HomePage = lazy(() =>
  import("./pages/Home").then((module) => ({ default: module.HomePage }))
);
const PairPage = lazy(() =>
  import("./pages/Pair").then((module) => ({ default: module.PairPage }))
);
const PlayedPage = lazy(() =>
  import("./pages/Played").then((module) => ({ default: module.PlayedPage }))
);
const WelcomePage = lazy(() =>
  import("./pages/Welcome").then((module) => ({ default: module.WelcomePage }))
);

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
                onRetry={() => void bootstrapAccount({ showLoadingScreen: true })}
              />
            ) : (
              <Suspense fallback={<V3RouteChunkFallback />}>
                {routeMode === "pair" ||
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
              </Suspense>
            )}
          </V3RouteTransition>
        </div>
      </main>
      <V3Footer />
    </div>
  );
}

function V3RouteChunkFallback() {
  return (
    <div className="v3-route-chunk-fallback" data-testid="route-chunk-loading-view">
      Ansicht wird geladen...
    </div>
  );
}
