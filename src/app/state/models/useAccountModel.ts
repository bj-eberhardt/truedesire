import { useCallback } from "react";
import type { api } from "../../../api/api";
import { useAccountActions } from "../../hooks/useAccountActions";
import type { Identity } from "../../../state/identity";
import type { PairView } from "../../../types";
import type { AccountContextValue } from "../AppContexts";

type ApiClient = ReturnType<typeof api>;

type UseAccountModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  bootstrap: () => Promise<unknown>;
  resetLocalIdentity: () => Promise<void>;
  setIdentity: (next: Identity | null) => void;
  setPair: (next: PairView | null) => void;
  clearMatches: () => void;
  clearQuestions: () => void;
  clearGlobalError: () => void;
  showNotice: (message: string) => void;
};

export function useAccountModel(opts: UseAccountModelOptions): AccountContextValue {
  const {
    apiClient,
    identity,
    bootstrap,
    resetLocalIdentity,
    setIdentity,
    setPair,
    clearMatches,
    clearQuestions,
    clearGlobalError,
    showNotice
  } = opts;
  const accountActions = useAccountActions({
    apiClient,
    bootstrap,
    resetLocalIdentity,
    setIdentity,
    setPair,
    clearMatches,
    clearQuestions
  });

  const copyPairingCode = useCallback(async () => {
    if (!identity?.code) return;
    await navigator.clipboard.writeText(identity.code);
    showNotice("Pairing-Code wurde in die Zwischenablage kopiert.");
  }, [identity, showNotice]);

  const deleteAccount = useCallback(async () => {
    clearGlobalError();
    await accountActions.deleteAccount();
  }, [accountActions, clearGlobalError]);

  const importBackupText = useCallback(
    async (txt: string) => {
      clearGlobalError();
      await accountActions.importBackupText(txt);
    },
    [accountActions, clearGlobalError]
  );

  return {
    accountDeletedModalOpen: accountActions.accountDeletedModalOpen,
    setAccountDeletedModalOpen: accountActions.setAccountDeletedModalOpen,
    copyPairingCode,
    exportBackupText: accountActions.exportBackupText,
    importBackupText,
    deleteAccount
  };
}
