import type { ReactNode } from "react";
import { ErrorPanel } from "../../components/ErrorPanel";
import { Toast } from "../../components/Toast";
import { useFeedbackContext } from "./AppContexts";
import { useAppModel } from "./useAppModel";
import { AccountProvider } from "./providers/AccountProvider";
import { FeedbackProvider } from "./providers/FeedbackProvider";
import { GroupSettingsProvider } from "./providers/GroupSettingsProvider";
import { MatchesProvider } from "./providers/MatchesProvider";
import { PairWorkspaceProvider } from "./providers/PairWorkspaceProvider";
import { PairingProvider } from "./providers/PairingProvider";
import { QuestionsProvider } from "./providers/QuestionsProvider";
import { SessionProvider } from "./providers/SessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const model = useAppModel();

  return (
    <FeedbackProvider value={model.feedback}>
      <SessionProvider value={model.session}>
        <AccountProvider value={model.account}>
          <PairingProvider value={model.pairing}>
            <PairWorkspaceProvider value={model.pairWorkspace}>
              <QuestionsProvider value={model.questions}>
                <MatchesProvider value={model.matches}>
                  <GroupSettingsProvider value={model.groupSettings}>
                    {children}
                  </GroupSettingsProvider>
                </MatchesProvider>
              </QuestionsProvider>
            </PairWorkspaceProvider>
          </PairingProvider>
        </AccountProvider>
      </SessionProvider>
    </FeedbackProvider>
  );
}

export function AppGlobalChrome({ children }: { children: ReactNode }) {
  const feedback = useFeedbackContext();

  return (
    <div className="app-shell">
      {children}
      {feedback.toast ? (
        <Toast message={feedback.toast.message} kind={feedback.toast.kind} />
      ) : null}
      {feedback.error ? <ErrorPanel error={feedback.error} /> : null}
    </div>
  );
}
