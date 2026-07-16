import { useCallback, useState } from "react";
import { pairingInlineErrorFor } from "./pairingErrors";
import type { ApiClient } from "./types";

export function usePairingActions(opts: {
  apiClient: ApiClient | null;
  refreshPairing: () => Promise<void>;
}) {
  const { apiClient, refreshPairing } = opts;
  const [pairingInlineError, setPairingInlineError] = useState<string | null>(null);

  const clearPairingInlineError = useCallback(() => setPairingInlineError(null), []);

  const sendPairRequest = useCallback(
    async (partnerCodeInput: string) => {
      if (!apiClient) return;
      setPairingInlineError(null);
      const partnerCode = partnerCodeInput.trim().toUpperCase();
      if (!partnerCode) return;
      try {
        await apiClient.pairing.request(partnerCode);
        await refreshPairing();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const inlineError = pairingInlineErrorFor(msg);
        if (inlineError) {
          setPairingInlineError(inlineError);
          return;
        }
        throw new Error(msg);
      }
    },
    [apiClient, refreshPairing]
  );

  const respond = useCallback(
    async (requestId: string, action: "accept" | "reject" | "cancel") => {
      if (!apiClient) return { pairId: null };
      setPairingInlineError(null);
      const result = await apiClient.pairing.respond(requestId, action);
      await refreshPairing();
      return { pairId: result.pairId ?? null };
    },
    [apiClient, refreshPairing]
  );

  return { clearPairingInlineError, pairingInlineError, respond, sendPairRequest };
}
