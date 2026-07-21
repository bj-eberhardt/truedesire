import { useCallback } from "react";
import { goV3AccountDeleted } from "../../../routes";
import { importBackup, loadIdentity } from "../../../../state/identity";
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
  const importBackupText = useCallback(
    async (txt: string) => {
      clearGlobalError();
      await importBackup(txt);
      const hydrated = await loadIdentity({
        ensureRegistered: true,
        recoverMissingAccount: true
      });
      if (
        !hydrated ||
        typeof hydrated !== "object" ||
        !("userId" in hydrated) ||
        !hydrated.userId
      ) {
        throw new Error("backup_auth_failed");
      }
      setIdentity(hydrated);
      await bootstrap();
    },
    [bootstrap, clearGlobalError, setIdentity]
  );

  const clearLocalAccountState = useCallback(async () => {
    clearGlobalError();
    await resetLocalIdentity();
    await idbSet("ui:lastPairId", "");
    setPair(null);
    clearMatches();
    clearQuestions();
    setIdentity(null);
    goV3AccountDeleted();
  }, [clearGlobalError, clearMatches, clearQuestions, resetLocalIdentity, setIdentity, setPair]);

  const deleteLocalAccount = useCallback(async () => {
    await clearLocalAccountState();
  }, [clearLocalAccountState]);

  const deleteAccount = useCallback(async () => {
    try {
      if (apiClient) await apiClient.auth.deleteMe();
    } catch {
      // allow local delete even if server delete fails
    }
    await clearLocalAccountState();
  }, [apiClient, clearLocalAccountState]);

  return {
    importBackupText,
    deleteLocalAccount,
    deleteAccount
  };
}
