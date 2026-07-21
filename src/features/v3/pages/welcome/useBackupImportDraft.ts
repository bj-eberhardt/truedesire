import { useEffect, useRef, useState } from "react";
import { goV3 } from "../../../../app/routes";
import { toUserMessage } from "../../lib/errors";

const BACKUP_IMPORT_SUCCESS_REDIRECT_MS = 3000;

type UseBackupImportDraftOptions = {
  importBackupText: (txt: string) => Promise<void>;
  setOnboardError: (message: string | null) => void;
};

export function useBackupImportDraft({
  importBackupText,
  setOnboardError
}: UseBackupImportDraftOptions) {
  const [backupText, setBackupText] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [importSuccessVisible, setImportSuccessVisible] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  function clearImportSuccessRedirect() {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  }

  function clearBackupFileSelection() {
    setBackupFile(null);
    setBackupFileName(null);
    if (backupFileInputRef.current) backupFileInputRef.current.value = "";
  }

  function resetBackupDraft() {
    clearImportSuccessRedirect();
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

  function showImportSuccessAndRedirect() {
    clearImportSuccessRedirect();
    setImportSuccessVisible(true);
    redirectTimeoutRef.current = setTimeout(() => {
      redirectTimeoutRef.current = null;
      goV3();
    }, BACKUP_IMPORT_SUCCESS_REDIRECT_MS);
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
      showImportSuccessAndRedirect();
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
