import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import "../../styles/v3.css";
import { goV3, goV3Ask, goV3Backup, goV3Pair, goV3Played, type V3Route } from "../../app/routes";
import { Toast } from "../../components/Toast";
import type { MatchView } from "../../hooks/useMatches";
import type { MyPairs, PairingIncoming, PairingOutgoing } from "../../hooks/usePairing";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../types";
import { V3Footer } from "./components/V3Footer";
import { V3Header } from "./components/V3Header";
import { V3Notice } from "./components/V3Notice";
import { InfoIcon } from "./components/icons/InfoIcon";
import { AskPage } from "./pages/Ask";
import { BackupPage } from "./pages/Backup";
import { HomePage } from "./pages/Home";
import { PairPage } from "./pages/Pair";
import { PlayedPage } from "./pages/Played";

type V3ShellProps = {
  route: V3Route;
  isBootstrappingAccount: boolean;
  identity: { userId: string; nickname: string; code?: string | null } | null;
  nickname: string;
  onNicknameChange: (next: string) => void;
  onRegister: () => Promise<void>;
  onBootstrap: () => Promise<unknown>;
  inlineNotice: string | null;

  onDeleteAccount: () => Promise<void>;
  onImportBackupText: (txt: string) => Promise<void>;
  onCopyPairingCode: () => Promise<void>;
  onExportBackupText: () => Promise<string>;

  pairingIncoming: PairingIncoming;
  pairingOutgoing: PairingOutgoing;
  myPairs: MyPairs;
  pairingInlineError: string | null;
  onClearPairingInlineError: () => void;
  onRefreshPairingRequests: () => Promise<void>;
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>;
  onRespondPairing: (
    requestId: string,
    action: "accept" | "reject" | "cancel"
  ) => Promise<{ pairId?: string | null } | void>;

  pair: PairView | null;
  isLoadingPairData: boolean;
  onOpenPair: (pairId: string) => Promise<void>;
  onRefreshPairView: () => Promise<void>;

  questions: DecryptedQuestion[];
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>;
  onAddQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>;

  matches: MatchView[];
  isLoadingMatches: boolean;
  onComputeMatches: () => Promise<void>;

  hiddenMatchIds: string[];
  setHiddenMatchIds: Dispatch<SetStateAction<string[]>>;
  showHiddenMatches: boolean;
  setShowHiddenMatches: Dispatch<SetStateAction<boolean>>;
  visibleMatchesCount: number;

  weeklyLimitInput: string;
  setWeeklyLimitInput: (v: string) => void;
  allowAllQuestions: boolean;
  setAllowAllQuestions: (v: boolean) => void;
  isLoadingGroupSettings: boolean;
  onRefreshGroupSettings: () => Promise<void>;
  onProposeGroupSettings: () => Promise<void>;
  onRespondGroupSettings: (action: "accept" | "reject" | "cancel") => Promise<void>;

  toast: { message: string; kind?: "default" | "success" | "error" } | null;
};

export function V3Shell(props: V3ShellProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const noop = useMemo(() => () => {}, []);

  const apiReady = !!props.identity?.userId;
  const routePairId = props.route.pairId;
  const routeMode = props.route.mode;
  const routeOnboard = props.route.onboard ?? "start";

  // Deep-link: ensure pair is loaded when route targets a specific pair.
  useEffect(() => {
    if (!apiReady) return;
    if (!routePairId) return;
    if (
      routeMode !== "pair" &&
      routeMode !== "pairMatches" &&
      routeMode !== "pairSettings" &&
      routeMode !== "ask" &&
      routeMode !== "played"
    )
      return;
    if (props.pair?.id === routePairId) return;
    setCardIndex(0);
    (async () => {
      try {
        await props.onOpenPair(routePairId);
      } catch {
        // ignore
      }
    })();
  }, [apiReady, props, routeMode, routePairId]);

  // Keep `cardIndex` stable while playing.
  // We only reset the index when switching to another pair (see deep-link loading effect).
  // The PairPage itself clamps the index to the available cards.

  const answerBegin = noop;
  const answerAbort = noop;
  const answerSaved = noop;

  const visibleMatchesCount = useMemo(() => props.visibleMatchesCount, [props.visibleMatchesCount]);

  return (
    <div className="feature-shell v3-shell">
      <V3Header
        identity={props.identity}
        onCopyPairingCode={props.onCopyPairingCode}
        onOpenBackup={() => goV3Backup()}
        onDeleteAccount={props.onDeleteAccount}
      />
      <main className="v3">
        <div className="v3-container">
          {props.inlineNotice ? (
            <V3Notice
              className="v3-notice-success"
              icon={<InfoIcon />}
              title="Kopiert"
              hint={props.inlineNotice}
            />
          ) : null}
          {(routeMode === "pair" || routeMode === "pairMatches" || routeMode === "pairSettings") &&
          routePairId ? (
            <PairPage
              pairId={routePairId}
              activeTab={
                routeMode === "pairMatches"
                  ? "matches"
                  : routeMode === "pairSettings"
                    ? "settings"
                    : "play"
              }
              identityUserId={props.identity?.userId ?? ""}
              pair={props.pair}
              questions={props.questions}
              answerSummary={props.answerSummary}
              isLoadingPairData={props.isLoadingPairData}
              onAnswer={props.onAnswer}
              onAnswerBegin={answerBegin}
              onAnswerAbort={answerAbort}
              onAnswerSaved={answerSaved}
              cardIndex={cardIndex}
              onSetCardIndex={setCardIndex}
              onBack={goV3}
              onRefreshView={props.onRefreshPairView}
              onGoAsk={() => goV3Ask(routePairId)}
              onGoPlayed={() => goV3Played(routePairId)}
              matches={props.matches}
              isLoadingMatches={props.isLoadingMatches}
              onComputeMatches={props.onComputeMatches}
              hiddenMatchIds={props.hiddenMatchIds}
              setHiddenMatchIds={(fn) => props.setHiddenMatchIds((prev) => fn(prev))}
              showHiddenMatches={props.showHiddenMatches}
              setShowHiddenMatches={(fn) => props.setShowHiddenMatches((prev) => fn(prev))}
              visibleMatchesCount={visibleMatchesCount}
              weeklyLimitInput={props.weeklyLimitInput}
              setWeeklyLimitInput={props.setWeeklyLimitInput}
              allowAllQuestions={props.allowAllQuestions}
              setAllowAllQuestions={props.setAllowAllQuestions}
              isLoadingGroupSettings={props.isLoadingGroupSettings}
              onRefreshGroupSettings={props.onRefreshGroupSettings}
              onProposeGroupSettings={props.onProposeGroupSettings}
              onRespondGroupSettings={props.onRespondGroupSettings}
            />
          ) : routeMode === "ask" && routePairId ? (
            <AskPage
              pairId={routePairId}
              pair={props.pair}
              onBack={() => goV3Pair(routePairId)}
              onSave={async (text, selfAnswer) => {
                await props.onAddQuestion(text, selfAnswer);
              }}
            />
          ) : routeMode === "played" && routePairId ? (
            <PlayedPage
              pairId={routePairId}
              pair={props.pair}
              questions={props.questions}
              answerSummary={props.answerSummary}
              onBack={() => goV3Pair(routePairId)}
              onAnswer={props.onAnswer}
            />
          ) : routeMode === "backup" ? (
            <BackupPage
              identityCode={props.identity?.code ?? null}
              onBack={goV3}
              onExportBackupText={props.onExportBackupText}
            />
          ) : (
            <HomePage
              isBootstrappingAccount={props.isBootstrappingAccount}
              identity={props.identity}
              nickname={props.nickname}
              onNicknameChange={props.onNicknameChange}
              onRegister={props.onRegister}
              onBootstrap={props.onBootstrap}
              onImportBackupText={props.onImportBackupText}
              onboardingStep={routeOnboard}
              onExportBackupText={props.onExportBackupText}
              myPairs={props.myPairs}
              pairingIncoming={props.pairingIncoming}
              pairingOutgoing={props.pairingOutgoing}
              pairingInlineError={props.pairingInlineError}
              onClearPairingInlineError={props.onClearPairingInlineError}
              onRefreshPairingRequests={props.onRefreshPairingRequests}
              onSendPairRequest={props.onSendPairRequest}
              onRespondPairing={props.onRespondPairing}
              onOpenPair={async (pairId) => {
                setCardIndex(0);
                goV3Pair(pairId);
              }}
            />
          )}
        </div>
      </main>
      {props.toast ? <Toast message={props.toast.message} kind={props.toast.kind} /> : null}
      <V3Footer />
    </div>
  );
}
