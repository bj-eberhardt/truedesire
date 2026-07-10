import { useCallback, useEffect, useState } from "react";
import { loadIdentity, resetIdentity, type Identity } from "../state/identity";

type UseIdentityResult = {
  identity: Identity | null;
  nickname: string;
  setNickname: (next: string) => void;
  isBootstrappingAccount: boolean;
  setIdentity: (next: Identity | null) => void;
  bootstrap: () => Promise<Identity | null>;
  register: () => Promise<void>;
  resetLocalIdentity: () => Promise<void>;
};

export function useIdentity(): UseIdentityResult {
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

  const register = useCallback(async () => {
    const trimmed = nickname.trim();
    if (!trimmed) throw new Error("nickname_required");
    const next = await loadIdentity({ nickname: trimmed, ensureRegistered: true });
    if (!next) throw new Error("identity_not_available");
    if (!next.userId) {
      throw new Error("register_failed");
    }
    setIdentity(next);
    setNickname(next.nickname);
  }, [nickname]);

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
