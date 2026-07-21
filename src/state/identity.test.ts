import { beforeEach, expect, test, vi } from "vitest";
import { ApiError } from "../api/api";
import { api } from "../api/api";
import { idbGet, idbSet } from "../storage/idb";
import { loadIdentity } from "./identity";

vi.mock("../api/baseUrl", () => ({
  getApiBaseUrl: () => "https://example.test"
}));

vi.mock("../api/api", async () => {
  const actual = await vi.importActual<typeof import("../api/api")>("../api/api");
  return {
    ...actual,
    api: vi.fn()
  };
});

vi.mock("../crypto/keys", () => ({
  generateKeys: vi.fn(),
  importRuntimeKeys: vi.fn(() =>
    Promise.resolve({
      signPrivateKey: {} as CryptoKey,
      signPublicKey: {} as CryptoKey,
      ecdhPrivateKey: {} as CryptoKey,
      ecdhPublicRawB64: "ecdh-public"
    })
  )
}));

vi.mock("../storage/idb", () => ({
  idbDel: vi.fn(),
  idbGet: vi.fn(),
  idbSet: vi.fn(() => Promise.resolve())
}));

const storedBackup = {
  userId: "old-user",
  nickname: "Ada",
  code: "OLD111",
  keys: {
    signPrivateJwk: { kty: "EC", crv: "P-256", d: "d", x: "x", y: "y" },
    signPublicJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
    ecdhPrivateJwk: { kty: "EC", crv: "P-256", d: "d2", x: "x2", y: "y2" },
    ecdhPublicRawB64: "ecdh-public"
  }
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("recovers imported backup accounts that are unknown on the current server", async () => {
  const oldMe = vi.fn(() => Promise.reject(new ApiError("unauthorized", 401)));
  const register = vi.fn(() => Promise.resolve({ userId: "new-user" }));
  const recoveredMe = vi.fn(() =>
    Promise.resolve({
      id: "new-user",
      code: "NEW111",
      nickname: "Ada",
      ecdhPublicRawB64: "ecdh-public"
    })
  );

  vi.mocked(idbGet).mockResolvedValue(storedBackup);
  vi.mocked(api)
    .mockReturnValueOnce({ auth: { me: oldMe } } as unknown as ReturnType<typeof api>)
    .mockReturnValueOnce({ auth: { register } } as unknown as ReturnType<typeof api>)
    .mockReturnValueOnce({ auth: { me: recoveredMe } } as unknown as ReturnType<typeof api>);

  const identity = await loadIdentity({
    ensureRegistered: true,
    recoverMissingAccount: true
  });

  expect(identity?.userId).toBe("new-user");
  expect(identity?.code).toBe("NEW111");
  expect(register).toHaveBeenCalledWith({
    nickname: "Ada",
    signPublicJwk: storedBackup.keys.signPublicJwk,
    ecdhPublicRawB64: "ecdh-public"
  });
  expect(idbSet).toHaveBeenLastCalledWith("identity:v1", {
    ...storedBackup,
    userId: "new-user",
    code: "NEW111"
  });
});
