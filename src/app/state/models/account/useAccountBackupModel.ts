import { useCallback } from "react";
import { exportBackup } from "../../../../state/identity";

export function useAccountBackupModel() {
  const exportBackupText = useCallback(async (): Promise<string> => {
    return await exportBackup();
  }, []);

  return { exportBackupText };
}
