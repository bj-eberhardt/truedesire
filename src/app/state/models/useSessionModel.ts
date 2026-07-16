import { useMemo } from "react";
import type { Identity } from "../../../state/identity";
import type { PublicIdentity, SessionContextValue } from "../AppContexts";
import { useIdentityStorage } from "./session/useIdentityStorage";
import { useSessionApiClient } from "./session/useSessionApiClient";

export type SessionModel = {
  apiClient: ReturnType<typeof useSessionApiClient>;
  identity: Identity | null;
  registerIdentity: (nicknameOverride?: string) => Promise<Identity>;
  resetLocalIdentity: () => Promise<void>;
  session: SessionContextValue;
  setIdentity: (next: Identity | null) => void;
};

export function useSessionModel(): SessionModel {
  const {
    identity,
    nickname,
    setNickname,
    isBootstrappingAccount,
    bootstrap,
    register,
    resetLocalIdentity,
    setIdentity
  } = useIdentityStorage();
  const apiClient = useSessionApiClient(identity);

  const publicIdentity = useMemo<PublicIdentity | null>(() => {
    if (!identity?.userId) return null;
    return { userId: identity.userId, nickname: identity.nickname, code: identity.code };
  }, [identity]);

  return {
    apiClient,
    identity,
    registerIdentity: register,
    resetLocalIdentity,
    setIdentity,
    session: {
      identity: publicIdentity,
      nicknameDraft: nickname,
      isBootstrappingAccount,
      updateNicknameDraft: setNickname,
      bootstrapAccount: bootstrap,
      registerAccount: async (nicknameOverride?: string) => {
        await register(nicknameOverride);
      }
    }
  };
}
