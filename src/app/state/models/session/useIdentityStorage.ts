import { useCallback, useEffect, useRef, useState } from "react";
import { isTemporaryApiError, isUnauthorizedApiError } from "../../../../api/api";
import { loadIdentity, resetIdentity, type Identity } from "../../../../state/identity";
import type { BootstrapAccountStatus } from "../../types";

type UseIdentityStorageResult = {
  identity: Identity | null;
  nickname: string;
  setNickname: (next: string) => void;
  bootstrapAccountStatus: BootstrapAccountStatus;
  isBootstrappingAccount: boolean;
  setIdentity: (next: Identity | null) => void;
  bootstrap: () => Promise<Identity | null>;
  register: (nicknameOverride?: string) => Promise<Identity>;
  resetLocalIdentity: () => Promise<void>;
};

type UseIdentityStorageOptions = {
  minLoadingMs?: number;
};

export const ACCOUNT_BOOTSTRAP_MIN_LOADING_MS = 1_200;

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useIdentityStorage(opts: UseIdentityStorageOptions = {}): UseIdentityStorageResult {
  const minLoadingMs = opts.minLoadingMs ?? ACCOUNT_BOOTSTRAP_MIN_LOADING_MS;
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [nickname, setNickname] = useState("");
  const [bootstrapAccountStatus, setBootstrapAccountStatus] =
    useState<BootstrapAccountStatus>("loading");
  const bootstrapPromiseRef = useRef<Promise<Identity | null> | null>(null);

  const bootstrap = useCallback((): Promise<Identity | null> => {
    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;

    const nextBootstrap = (async () => {
      const startedAt = Date.now();
      setBootstrapAccountStatus("loading");
      try {
        const id = await loadIdentity();
        const hydrated = id?.userId ? await loadIdentity({ ensureRegistered: true }) : id;
        setIdentity(hydrated);
        setNickname(hydrated?.nickname ?? "");
        await wait(minLoadingMs - (Date.now() - startedAt));
        setBootstrapAccountStatus("ready");
        return hydrated;
      } catch (error: unknown) {
        await wait(minLoadingMs - (Date.now() - startedAt));
        if (isUnauthorizedApiError(error)) {
          setBootstrapAccountStatus("unauthorized");
          return null;
        }
        if (isTemporaryApiError(error)) {
          setBootstrapAccountStatus("temporary");
          return null;
        }
        setBootstrapAccountStatus("temporary");
        return null;
      } finally {
        bootstrapPromiseRef.current = null;
      }
    })();

    bootstrapPromiseRef.current = nextBootstrap;
    return nextBootstrap;
  }, [minLoadingMs]);

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
    bootstrapAccountStatus,
    isBootstrappingAccount: bootstrapAccountStatus === "loading",
    setIdentity,
    bootstrap,
    register,
    resetLocalIdentity
  };
}
