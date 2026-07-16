import { useMemo } from "react";
import { api } from "../../../../api/api";
import { getApiBaseUrl } from "../../../../api/baseUrl";
import type { Identity } from "../../../../state/identity";

export function useSessionApiClient(identity: Identity | null) {
  return useMemo(() => {
    if (!identity?.userId) return null;
    return api({
      baseUrl: getApiBaseUrl(),
      getAuthMaterial: async () => identity.auth
    });
  }, [identity]);
}
