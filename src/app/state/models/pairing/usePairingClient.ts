import { useCallback } from "react";
import { api } from "../../../../api/api";
import { getApiBaseUrl } from "../../../../api/baseUrl";
import type { Identity } from "../../../../state/identity";
import type { ApiClient } from "./types";

export function usePairingClient(apiClient: ApiClient | null, identity: Identity | null) {
  return useCallback(
    (identityOverride?: Identity): ApiClient | null => {
      const id = identityOverride ?? identity;
      if (!id?.userId) return null;
      return (
        apiClient ??
        api({
          baseUrl: getApiBaseUrl(),
          getAuthMaterial: async () => id.auth
        })
      );
    },
    [apiClient, identity]
  );
}
