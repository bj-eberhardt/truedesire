import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ApiError } from "../../../../api/api";
import { loadIdentity, resetIdentity, type Identity } from "../../../../state/identity";
import { ACCOUNT_BOOTSTRAP_MIN_LOADING_MS, useIdentityStorage } from "./useIdentityStorage";

vi.mock("../../../../state/identity", () => ({
  loadIdentity: vi.fn(),
  resetIdentity: vi.fn(() => Promise.resolve())
}));

type IdentityStorage = ReturnType<typeof useIdentityStorage>;

const anonymousIdentity = {
  userId: null,
  nickname: "Anon",
  code: null,
  auth: { userId: "", signPrivateKey: {} as CryptoKey },
  keys: {}
} as Identity;

const storedIdentity = {
  userId: "user-1",
  nickname: "Ada",
  code: "AAA111",
  auth: { userId: "user-1", signPrivateKey: {} as CryptoKey },
  keys: {}
} as Identity;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function renderIdentityStorage(
  opts: Parameters<typeof useIdentityStorage>[0] = { minLoadingMs: 0 }
) {
  let current: IdentityStorage | null = null;
  let renderer: ReactTestRenderer | null = null;

  function HookReader({ onValue }: { onValue: (value: IdentityStorage) => void }) {
    const value = useIdentityStorage(opts);
    React.useEffect(() => {
      onValue(value);
    }, [onValue, value]);
    return null;
  }

  await act(async () => {
    renderer = create(React.createElement(HookReader, { onValue: (value) => (current = value) }));
  });

  if (!current || !renderer) throw new Error("Hook did not render");

  return {
    get current() {
      if (!current) throw new Error("Hook value missing");
      return current;
    },
    unmount: async () => {
      await act(async () => {
        renderer?.unmount();
      });
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  const originalConsoleError = console.error;
  vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
      return;
    }
    originalConsoleError(message, ...args);
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("boots to ready without account data", async () => {
  vi.mocked(loadIdentity).mockResolvedValue(anonymousIdentity);

  const hook = await renderIdentityStorage();

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  expect(hook.current.identity?.userId).toBeNull();
  expect(loadIdentity).toHaveBeenCalledOnce();
  await hook.unmount();
});

test("hydrates stored account data before becoming ready", async () => {
  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockResolvedValueOnce(storedIdentity);

  const hook = await renderIdentityStorage();

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  expect(hook.current.identity?.userId).toBe("user-1");
  expect(loadIdentity).toHaveBeenNthCalledWith(2, { ensureRegistered: true });
  await hook.unmount();
});

test("keeps local account state and reports unauthorized on 401", async () => {
  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockResolvedValueOnce(storedIdentity);
  const hook = await renderIdentityStorage();

  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockRejectedValueOnce(new ApiError("unauthorized", 401));

  await act(async () => {
    await hook.current.bootstrap();
  });

  expect(hook.current.bootstrapAccountStatus).toBe("unauthorized");
  expect(hook.current.identity?.userId).toBe("user-1");
  expect(resetIdentity).not.toHaveBeenCalled();
  await hook.unmount();
});

test("reports temporary status on 500 and network failures", async () => {
  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockRejectedValueOnce(new ApiError("internal_error", 500));
  const hook = await renderIdentityStorage();

  expect(hook.current.bootstrapAccountStatus).toBe("temporary");

  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockRejectedValueOnce(new ApiError("Failed to fetch", null));

  await act(async () => {
    await hook.current.bootstrap();
  });

  expect(hook.current.bootstrapAccountStatus).toBe("temporary");
  await hook.unmount();
});

test("retry returns to loading and can recover to ready", async () => {
  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockRejectedValueOnce(new ApiError("internal_error", 500));
  const hook = await renderIdentityStorage();
  const pendingLoad = deferred<Identity>();

  vi.mocked(loadIdentity)
    .mockReturnValueOnce(pendingLoad.promise)
    .mockResolvedValueOnce(storedIdentity);

  let retry: Promise<Identity | null>;
  act(() => {
    retry = hook.current.bootstrap({ showLoadingScreen: true });
  });

  expect(hook.current.bootstrapAccountStatus).toBe("loading");

  await act(async () => {
    pendingLoad.resolve(storedIdentity);
    await retry;
  });

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  expect(hook.current.identity?.userId).toBe("user-1");
  await hook.unmount();
});

test("manual hydration can run without showing the loading gate", async () => {
  vi.mocked(loadIdentity).mockResolvedValue(anonymousIdentity);
  const hook = await renderIdentityStorage();

  vi.mocked(loadIdentity)
    .mockResolvedValueOnce(storedIdentity)
    .mockResolvedValueOnce(storedIdentity);

  await act(async () => {
    await hook.current.bootstrap();
  });

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  expect(hook.current.identity?.userId).toBe("user-1");
  await hook.unmount();
});

test("reuses an in-flight bootstrap request", async () => {
  const pendingLoad = deferred<Identity>();
  vi.mocked(loadIdentity)
    .mockReturnValueOnce(pendingLoad.promise)
    .mockResolvedValue(storedIdentity);
  const hook = await renderIdentityStorage();

  let first: Promise<Identity | null>;
  let second: Promise<Identity | null>;
  act(() => {
    first = hook.current.bootstrap();
    second = hook.current.bootstrap();
  });

  expect(first!).toBe(second!);
  expect(loadIdentity).toHaveBeenCalledTimes(1);

  await act(async () => {
    pendingLoad.resolve(storedIdentity);
    await first!;
  });

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  await hook.unmount();
});

test("keeps the initial bootstrap loading state visible for at least 1.2 seconds", async () => {
  vi.useFakeTimers();
  vi.mocked(loadIdentity).mockResolvedValue(anonymousIdentity);
  const hook = await renderIdentityStorage({ minLoadingMs: ACCOUNT_BOOTSTRAP_MIN_LOADING_MS });

  expect(hook.current.bootstrapAccountStatus).toBe("loading");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(ACCOUNT_BOOTSTRAP_MIN_LOADING_MS - 1);
  });

  expect(hook.current.bootstrapAccountStatus).toBe("loading");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });

  expect(hook.current.bootstrapAccountStatus).toBe("ready");
  await hook.unmount();
});
