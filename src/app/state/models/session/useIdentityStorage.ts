import { useCallback, useEffect, useState } from "react";
import { loadIdentity, resetIdentity, type Identity } from "../../../../state/identity";

type UseIdentityStorageResult = {
  identity: Identity | null;
  nickname: string;
  setNickname: (next: string) => void;
  isBootstrappingAccount: boolean;
  setIdentity: (next: Identity | null) => void;
  bootstrap: () => Promise<Identity | null>;
  register: (nicknameOverride?: string) => Promise<Identity>;
  resetLocalIdentity: () => Promise<void>;
};

export function useIdentityStorage(): UseIdentityStorageResult {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [nickname, setNickname] = useState("");
  const [isBootstrappingAccount, setIsBootstrappingAccount] = useState(true);

  const bootstrap = useCallback(async (): Promise<Identity | null> => {
    setIsBootstrappingAccount(true);
    try {
      const id = await loadIdentity();
      const hydrated = id?.userId ? await loadIdentity({ ensureRegistered: true }) : id;
      setIdentity(hydrated);
      setNickname(hydrated?.nickname ?? "");
      return hydrated;
    } finally {
      setIsBootstrappingAccount(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const register = useCallback(
    async (nicknameOverride?: string) => {
      const trimmed = (nicknameOverride ?? nickname).trim();
      if (!trimmed) throw new Error("nickname_required");
      await resetIdentity();
      const next = await loadIdentity({ nickname: trimmed, ensureRegistered: true });
      if (!next) throw new Error("identity_not_available");
      if (!next.userId) {
        throw new Error("register_failed");
      }
      setIdentity(next);
      setNickname(next.nickname);
      return next;
    },
    [nickname]
  );

  const resetLocalIdentity = useCallback(async () => {
    await resetIdentity();
    setIdentity(null);
    setNickname("");
  }, []);

  return {
    identity,
    nickname,
    setNickname,
    isBootstrappingAccount,
    setIdentity,
    bootstrap,
    register,
    resetLocalIdentity
  };
}
