import { beforeEach, expect, test, vi } from "vitest";
import { api, ApiError, isTemporaryApiError } from "./api";

vi.mock("../crypto/sign", () => ({
  sha256Base64: vi.fn(() => Promise.resolve("hash")),
  signRequest: vi.fn(() => Promise.resolve("signature"))
}));

const signPrivateKey = {} as CryptoKey;

beforeEach(() => {
  vi.restoreAllMocks();
});

test("signed requests throw ApiError with response status", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    })
  );

  const client = api({
    baseUrl: "https://example.test",
    getAuthMaterial: async () => ({ userId: "user-1", signPrivateKey })
  });

  await expect(client.auth.me()).rejects.toMatchObject({
    name: "ApiError",
    message: "unauthorized",
    status: 401
  });
});

test("signed requests classify network failures as temporary", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

  const client = api({
    baseUrl: "https://example.test",
    getAuthMaterial: async () => ({ userId: "user-1", signPrivateKey })
  });

  await expect(client.auth.me()).rejects.toSatisfy((error: unknown) => {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: null });
    expect(isTemporaryApiError(error)).toBe(true);
    return true;
  });
});
