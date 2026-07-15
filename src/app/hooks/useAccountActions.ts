import { useCallback, useState } from "react";
import type { api } from "../../api/api";
import { exportBackup, importBackup, type Identity } from "../../state/identity";
import { idbSet } from "../../storage/idb";
import type { PairView } from "../../types";

type ApiClient = ReturnType<typeof api>;

type UseAccountActionsOptions = {
  apiClient: ApiClient | null;
  bootstrap: () => Promise<unknown>;
  resetLocalIdentity: () => Promise<void>;
  setIdentity: (next: Identity | null) => void;
  setPair: (next: PairView | null) => void;
  clearMatches: () => void;
  clearQuestions: () => void;
};

type UseAccountActionsResult = {
  accountDeletedModalOpen: boolean;
  setAccountDeletedModalOpen: (open: boolean) => void;
  exportBackupText: () => Promise<string>;
  importBackupText: (txt: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export function useAccountActions(opts: UseAccountActionsOptions): UseAccountActionsResult {
  const {
    apiClient,
    bootstrap,
    resetLocalIdentity,
    setIdentity,
    setPair,
    clearMatches,
    clearQuestions
  } = opts;
  const [accountDeletedModalOpen, setAccountDeletedModalOpen] = useState(false);

  const exportBackupText = useCallback(async (): Promise<string> => {
    return await exportBackup();
  }, []);

  const importBackupText = useCallback(
    async (txt: string) => {
      await importBackup(txt);
      await bootstrap();
    },
    [bootstrap]
  );

  const deleteAccount = useCallback(async () => {
    try {
      if (apiClient) await apiClient.auth.deleteMe();
    } catch {
      // allow local delete even if server delete fails
    }
    await resetLocalIdentity();
    await idbSet("ui:lastPairId", "");
    setPair(null);
    clearMatches();
    clearQuestions();
    setIdentity(null);
    window.location.hash = "#/v3/welcome";
    setAccountDeletedModalOpen(true);
  }, [apiClient, clearMatches, clearQuestions, resetLocalIdentity, setIdentity, setPair]);

  return {
    accountDeletedModalOpen,
    setAccountDeletedModalOpen,
    exportBackupText,
    importBackupText,
    deleteAccount
  };
}
