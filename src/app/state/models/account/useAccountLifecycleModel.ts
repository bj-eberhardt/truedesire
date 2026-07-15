import { useCallback, useState } from "react";
import { importBackup } from "../../../../state/identity";
import { idbSet } from "../../../../storage/idb";
import type { AccountModelOptions } from "./types";

type UseAccountLifecycleModelOptions = Pick<
  AccountModelOptions,
  | "apiClient"
  | "bootstrap"
  | "resetLocalIdentity"
  | "setIdentity"
  | "setPair"
  | "clearMatches"
  | "clearQuestions"
  | "clearGlobalError"
>;

export function useAccountLifecycleModel({
  apiClient,
  bootstrap,
  resetLocalIdentity,
  setIdentity,
  setPair,
  clearMatches,
  clearQuestions,
  clearGlobalError
}: UseAccountLifecycleModelOptions) {
  const [accountDeletedModalOpen, setAccountDeletedModalOpen] = useState(false);

  const importBackupText = useCallback(
    async (txt: string) => {
      clearGlobalError();
      await importBackup(txt);
      await bootstrap();
    },
    [bootstrap, clearGlobalError]
  );

  const deleteAccount = useCallback(async () => {
    clearGlobalError();
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
  }, [
    apiClient,
    clearGlobalError,
    clearMatches,
    clearQuestions,
    resetLocalIdentity,
    setIdentity,
    setPair
  ]);

  return {
    accountDeletedModalOpen,
    setAccountDeletedModalOpen,
    importBackupText,
    deleteAccount
  };
}
