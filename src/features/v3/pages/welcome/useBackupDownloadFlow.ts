import { useState } from "react";
import { goV3 } from "../../../../app/routes";
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from "../../lib/backup";
import { toUserMessage } from "../../lib/errors";

const MIN_BACKUP_DOWNLOAD_FEEDBACK_MS = 2_000;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type UseBackupDownloadFlowOptions = {
  bootstrapAccount: () => Promise<{ userId?: string | null } | null>;
  exportBackupText: () => Promise<string>;
  identity: { code?: string | null } | null;
  setOnboardError: (message: string | null) => void;
};

export function useBackupDownloadFlow({
  bootstrapAccount,
  exportBackupText,
  identity,
  setOnboardError
}: UseBackupDownloadFlowOptions) {
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  async function downloadBackup() {
    const startedAt = window.performance.now();
    try {
      setOnboardError(null);
      setIsDownloadingBackup(true);
      const txt = await exportBackupText();
      const formatted = formatJsonMaybe(txt);
      const filename = safeBackupFilename(identity?.code ?? "backup");
      downloadTextFile({ filename, content: formatted });
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    } finally {
      const elapsed = window.performance.now() - startedAt;
      if (elapsed < MIN_BACKUP_DOWNLOAD_FEEDBACK_MS) {
        await wait(MIN_BACKUP_DOWNLOAD_FEEDBACK_MS - elapsed);
      }
      setIsDownloadingBackup(false);
    }
  }

  async function finishOnboarding() {
    setOnboardError(null);
    try {
      const hydrated = await bootstrapAccount();
      if (!hydrated?.userId) {
        setOnboardError("Konto konnte nicht geladen werden. Bitte kurz warten und erneut versuchen.");
        return;
      }
    } catch (e: unknown) {
      setOnboardError(e instanceof Error ? e.message : String(e));
      return;
    }
    goV3();
  }

  return { downloadBackup, finishOnboarding, isDownloadingBackup };
}
