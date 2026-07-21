import { useRef, useState } from "react";
import { goV3 } from "../../../../app/routes";
import { toUserMessage } from "../../lib/errors";

type UseBackupImportDraftOptions = {
  bootstrapAccount: (opts?: { showLoadingScreen?: boolean }) => Promise<unknown>;
  importBackupText: (txt: string) => Promise<void>;
  setOnboardError: (message: string | null) => void;
};

export function useBackupImportDraft({
  bootstrapAccount,
  importBackupText,
  setOnboardError
}: UseBackupImportDraftOptions) {
  const [backupText, setBackupText] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [importSuccessVisible, setImportSuccessVisible] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  function clearBackupFileSelection() {
    setBackupFile(null);
    setBackupFileName(null);
    if (backupFileInputRef.current) backupFileInputRef.current.value = "";
  }

  function resetBackupDraft() {
    setBackupText("");
    clearBackupFileSelection();
    setImportSuccessVisible(false);
  }

  function selectBackupFile(file: File | null) {
    if (!file) {
      clearBackupFileSelection();
      return;
    }
    setOnboardError(null);
    setImportSuccessVisible(false);
    setBackupFile(file);
    setBackupFileName(file.name);
  }

  async function importBackupDraft(txt: string) {
    const trimmed = txt.trim();
    if (!trimmed) {
      setOnboardError("Bitte lade eine Backup-Datei hoch oder füge dein Backup-JSON ein.");
      return;
    }
    try {
      JSON.parse(trimmed);
    } catch {
      setOnboardError("Der eingefügte Text ist kein valides Backup (ungültiges JSON).");
      return;
    }
    try {
      setOnboardError(null);
      await importBackupText(trimmed);
      setBackupText("");
      clearBackupFileSelection();
      setImportSuccessVisible(false);
      const bootstrapPromise = bootstrapAccount({ showLoadingScreen: true });
      goV3();
      await bootstrapPromise;
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    }
  }

  async function importBackupFile(file: File) {
    try {
      const txt = (await file.text()).trim();
      if (!txt) {
        setOnboardError("Die Datei ist leer und keine valide Backup-Datei.");
        return;
      }
      try {
        JSON.parse(txt);
      } catch {
        setOnboardError(
          "Die Datei konnte nicht gelesen werden oder ist keine valide Backup-Datei."
        );
        return;
      }
      await importBackupDraft(txt);
    } catch (e: unknown) {
      setOnboardError(toUserMessage(e));
    }
  }

  async function submitBackupImport() {
    if (backupFile) {
      await importBackupFile(backupFile);
      return;
    }
    await importBackupDraft(backupText);
  }

  return {
    backupFile,
    backupFileInputRef,
    backupFileName,
    backupText,
    clearBackupFileSelection,
    importSuccessVisible,
    resetBackupDraft,
    selectBackupFile,
    setBackupText,
    submitBackupImport
  };
}
