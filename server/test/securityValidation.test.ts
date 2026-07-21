import type { Request, Response } from "express";
import { webcrypto } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { signableMessage, sha256Base64, newId } from "../src/crypto/auth.js";
import { initializeDatabase } from "../src/db/migrations.js";
import { closePool, query } from "../src/db/pool.js";
import { authenticate } from "../src/middleware/auth.js";
import { createUser } from "../src/repositories/userRepository.js";
import { encryptedBlobSchema } from "../src/schemas/commonSchemas.js";

const validBlob = {
  ciphertextB64: Buffer.from("cipher").toString("base64"),
  ivB64: Buffer.from("123456789012").toString("base64"),
  aadB64: Buffer.from("aad").toString("base64")
};

function resetDb() {
  return query("truncate auth_nonces, answers, questions, pair_requests, pairs, users cascade");
}

function nonceCount(userId: string) {
  return query<{ count: string }>("select count(*)::text from auth_nonces where user_id = $1", [
    userId
  ]).then((result) => Number(result.rows[0].count));
}

async function signedHeaders(opts: {
  method: string;
  pathWithQuery: string;
  privateKey: Parameters<typeof webcrypto.subtle.sign>[1];
  userId: string;
  nonce?: string;
  rawBody?: Uint8Array;
}) {
  const rawBody = opts.rawBody ?? new Uint8Array();
  const timestamp = String(Date.now());
  const nonce = opts.nonce ?? "abcdefabcdefabcdefabcdef";
  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    opts.privateKey,
    signableMessage({
      method: opts.method,
      pathWithQuery: opts.pathWithQuery,
      timestamp,
      nonce,
      bodyHashB64: sha256Base64(rawBody)
    })
  );

  return {
    "x-user-id": opts.userId,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": Buffer.from(signature).toString("base64")
  };
}

function responseMock(rawBody = Buffer.from("")) {
  const res = {
    locals: { rawBody },
    set: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res as unknown as Response & typeof res;
}

async function authenticatedRequest(headers: Record<string, string>, rawBody = Buffer.from("")) {
  const req = {
    headers,
    method: "GET",
    originalUrl: "/api/auth/me"
  } as unknown as Request;
  const res = responseMock(rawBody);
  const next = vi.fn();

  await authenticate(req, res, next);
  return { next, res };
}

async function createSignedUser() {
  const keyPair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify"
  ]);
  const userId = newId();
  const signPublicJwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
  await createUser({
    id: userId,
    code: "SECURE1",
    nickname: "Secure",
    signPublicJwk,
    ecdhPublicRawB64: Buffer.from("public-key").toString("base64")
  });
  return { privateKey: keyPair.privateKey, userId };
}

beforeAll(async () => {
  await initializeDatabase();
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb();
});

afterAll(async () => {
  await closePool();
});

test("encrypted blob schema keeps legacy payloads compatible and normalizes schema version", () => {
  const parsed = encryptedBlobSchema.safeParse(validBlob);

  expect(parsed.success).toBe(true);
  if (!parsed.success) throw new Error("valid blob rejected");
  expect(parsed.data).toEqual({ ...validBlob, schemaVersion: 1 });
});

test("encrypted blob schema accepts explicit schema version 1", () => {
  expect(encryptedBlobSchema.safeParse({ ...validBlob, schemaVersion: 1 }).success).toBe(true);
});

test("encrypted blob schema rejects malformed or unsupported blob fields", () => {
  expect(encryptedBlobSchema.safeParse({ ...validBlob, ciphertextB64: "not-base64" }).success).toBe(
    false
  );
  expect(
    encryptedBlobSchema.safeParse({
      ...validBlob,
      ivB64: Buffer.from("short").toString("base64")
    }).success
  ).toBe(false);
  expect(
    encryptedBlobSchema.safeParse({
      ...validBlob,
      aadB64: Buffer.alloc(513).toString("base64")
    }).success
  ).toBe(false);
  expect(
    encryptedBlobSchema.safeParse({
      ...validBlob,
      ciphertextB64: Buffer.alloc(64 * 1024 + 1).toString("base64")
    }).success
  ).toBe(false);
  expect(encryptedBlobSchema.safeParse({ ...validBlob, schemaVersion: 2 }).success).toBe(false);
});

test("auth stores nonce only after a valid signature and rejects replay", async () => {
  const { privateKey, userId } = await createSignedUser();
  const headers = await signedHeaders({
    method: "GET",
    pathWithQuery: "/api/auth/me",
    privateKey,
    userId
  });

  const first = await authenticatedRequest(headers);
  expect(first.next).toHaveBeenCalledOnce();
  expect(await nonceCount(userId)).toBe(1);

  const replay = await authenticatedRequest(headers);
  expect(replay.next).not.toHaveBeenCalled();
  expect(replay.res.status).toHaveBeenCalledWith(401);
  expect(await nonceCount(userId)).toBe(1);
});

test("auth rejects bad signatures and nonce formats without storing a nonce", async () => {
  const { privateKey, userId } = await createSignedUser();
  const validHeaders = await signedHeaders({
    method: "GET",
    pathWithQuery: "/api/auth/me",
    privateKey,
    userId,
    nonce: "111111111111111111111111"
  });

  const badSignature = await authenticatedRequest({
    ...validHeaders,
    "x-signature": Buffer.from("bad-signature").toString("base64")
  });
  expect(badSignature.next).not.toHaveBeenCalled();
  expect(badSignature.res.status).toHaveBeenCalledWith(401);
  expect(await nonceCount(userId)).toBe(0);

  const badNonce = await authenticatedRequest({
    ...validHeaders,
    "x-nonce": "not-a-valid-nonce"
  });
  expect(badNonce.next).not.toHaveBeenCalled();
  expect(badNonce.res.status).toHaveBeenCalledWith(401);
  expect(await nonceCount(userId)).toBe(0);
});
