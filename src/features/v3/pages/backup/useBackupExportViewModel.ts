import { useEffect, useMemo, useRef, useState } from "react";
import { useAccountContext, useSessionContext } from "../../../../app/state";
import { downloadTextFile, formatJsonMaybe, safeBackupFilename } from "../../lib/backup";
import { toUserMessage } from "../../lib/errors";

export function useBackupExportViewModel() {
  const { identity } = useSessionContext();
  const { exportBackupText } = useAccountContext();
  const [backupText, setBackupText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const filename = useMemo(() => safeBackupFilename(identity?.code ?? null), [identity?.code]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    exportBackupText()
      .then((txt) => {
        if (cancelled) return;
        setBackupText(formatJsonMaybe(txt));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(toUserMessage(e));
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exportBackupText]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyBackupText() {
    await navigator.clipboard.writeText(backupText);
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadBackup() {
    downloadTextFile({ filename, content: backupText });
  }

  return {
    backupText,
    copied,
    copyBackupText,
    downloadBackup,
    error,
    filename,
    isLoading,
    setBackupText
  };
}
