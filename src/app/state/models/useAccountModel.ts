import type { AccountContextValue } from "../AppContexts";
import { useAccountBackupModel } from "./account/useAccountBackupModel";
import { useAccountLifecycleModel } from "./account/useAccountLifecycleModel";
import { usePairingCodeCopyModel } from "./account/usePairingCodeCopyModel";
import type { AccountModelOptions } from "./account/types";

export function useAccountModel(opts: AccountModelOptions): AccountContextValue {
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
  const backup = useAccountBackupModel();
  const lifecycle = useAccountLifecycleModel({
    apiClient,
    bootstrap,
    resetLocalIdentity,
    setIdentity,
    setPair,
    clearMatches,
    clearQuestions,
    clearGlobalError
  });
  const pairingCodeCopy = usePairingCodeCopyModel({ identity, showNotice });

  return {
    copyPairingCode: pairingCodeCopy.copyPairingCode,
    exportBackupText: backup.exportBackupText,
    importBackupText: lifecycle.importBackupText,
    deleteLocalAccount: lifecycle.deleteLocalAccount,
    deleteAccount: lifecycle.deleteAccount
  };
}
