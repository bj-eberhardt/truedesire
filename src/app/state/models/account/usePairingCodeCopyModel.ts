import { useCallback } from "react";
import type { AccountModelOptions } from "./types";

type UsePairingCodeCopyModelOptions = Pick<AccountModelOptions, "identity" | "showNotice">;

export function usePairingCodeCopyModel({ identity, showNotice }: UsePairingCodeCopyModelOptions) {
  const copyPairingCode = useCallback(async () => {
    if (!identity?.code) return;
    await navigator.clipboard.writeText(identity.code);
    showNotice("Pairing-Code wurde in die Zwischenablage kopiert.");
  }, [identity, showNotice]);

  return { copyPairingCode };
}
