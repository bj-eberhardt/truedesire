import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { parseConfig } from "../src/config.js";
import { newId } from "../src/crypto/auth.js";
import { initializeDatabase } from "../src/db/migrations.js";
import { closePool, query } from "../src/db/pool.js";
import { ApiErrorCode } from "../src/errors/apiErrorCode.js";
import { countWeeklyAnswers } from "../src/repositories/answerRepository.js";
import { getPairAccess } from "../src/repositories/accessRepository.js";
import {
  createAnswerForQuestion,
  upsertAnswerForQuestion
} from "../src/services/answerService.js";
import { registerAccount } from "../src/services/authService.js";
import { createPairRecordForUsers, getPairDetails } from "../src/services/pairService.js";
import {
  listPendingPairingRequests,
  requestPairingWithCode,
  respondToPairingRequest
} from "../src/services/pairingService.js";
import {
  createQuestionForPair,
  deleteQuestionById,
  listQuestionsForPair
} from "../src/services/questionService.js";
import { createUser, reserveUserNonce } from "../src/repositories/userRepository.js";
import { transaction } from "../src/db/pool.js";
import { insertPair } from "../src/repositories/pairRepository.js";
import type { EncryptedBlob, PairRecord } from "../src/storage/db.js";

const jwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };

const blob: EncryptedBlob = {
  ciphertextB64: "Y2lwaGVy",
  ivB64: "aXY=",
  aadB64: "YWFk",
  schemaVersion: 1
};

function requestMock() {
  return { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as never;
}

async function resetDb() {
  await query("truncate auth_nonces, answers, questions, pair_requests, pairs, users cascade");
}

async function user(nickname: string) {
  return registerAccount({ nickname, signPublicJwk: jwk, ecdhPublicRawB64: `pub-${nickname}` });
}

async function activePair(userA: string, userB: string): Promise<PairRecord> {
  return transaction((client) => insertPair(client, createPairRecordForUsers(userA, userB)));
}

beforeAll(async () => {
  await initializeDatabase();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closePool();
});

test("migrations are idempotent", async () => {
  await initializeDatabase();
  await initializeDatabase();
  const result = await query<{ count: string }>("select count(*)::text from schema_migrations");
  expect(Number(result.rows[0].count)).toBe(1);
});

test("config validates valid and invalid env", () => {
  const valid = parseConfig({
    DATABASE_URL: "postgres://user:pass@localhost:5432/app",
    PORT: "3001",
    DB_SSL: "false"
  });
  expect(valid.port).toBe(3001);
  expect(() => parseConfig({ DATABASE_URL: "not-a-url" })).toThrow(/Invalid server configuration/);
});

test("user register and lookup by generated code", async () => {
  const alice = await user("Alice");
  expect(alice.code).toMatch(/^[A-Z2-9]+$/);
  const found = await query<{ id: string }>("select id from users where code = $1", [alice.code]);
  expect(found.rows[0].id).toBe(alice.userId);
});

test("pairing request create, list, and accept", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const requestResult = await requestPairingWithCode(requestMock(), alice.userId, bob.code);
  expect(requestResult.ok).toBe(true);

  const pending = await listPendingPairingRequests(bob.userId);
  expect(pending.ok).toBe(true);
  if (!pending.ok) throw new Error("pending requests failed");
  expect(pending.value.incoming.length).toBe(1);

  const response = await respondToPairingRequest(
    bob.userId,
    pending.value.incoming[0].id,
    "accept"
  );
  expect(response.ok).toBe(true);
  if (!response.ok) throw new Error("pairing response failed");
  expect(response.value.pairId).toBeTruthy();
});

test("duplicate pair is rejected", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const first = await requestPairingWithCode(requestMock(), alice.userId, bob.code);
  expect(first.ok).toBe(true);
  const pending = await listPendingPairingRequests(bob.userId);
  expect(pending.ok).toBe(true);
  if (!pending.ok) throw new Error("pending requests failed");
  await respondToPairingRequest(bob.userId, pending.value.incoming[0].id, "accept");

  const duplicate = await requestPairingWithCode(requestMock(), alice.userId, bob.code);
  expect(duplicate.ok).toBe(false);
  if (duplicate.ok) throw new Error("duplicate unexpectedly succeeded");
  expect(duplicate.error.code).toBe(ApiErrorCode.AlreadyLinked);
});

test("pair access distinguishes missing and forbidden", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const carol = await user("Carol");
  const pair = await activePair(alice.userId, bob.userId);

  const missing = await getPairAccess(null, "missing-pair", alice.userId);
  expect(missing.kind).toBe("missing");
  const forbidden = await getPairAccess(null, pair.id, carol.userId);
  expect(forbidden.kind).toBe("forbidden");

  const serviceForbidden = await getPairDetails(pair.id, carol.userId);
  expect(serviceForbidden.ok).toBe(false);
  if (serviceForbidden.ok) throw new Error("forbidden access unexpectedly succeeded");
  expect(serviceForbidden.error.code).toBe(ApiErrorCode.Forbidden);
});

test("question create, list, and delete", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);

  const created = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error("question create failed");
  const listed = await listQuestionsForPair(pair.id, alice.userId);
  expect(listed.ok).toBe(true);
  if (!listed.ok) throw new Error("question list failed");
  expect(listed.value.length).toBe(1);

  const deleted = await deleteQuestionById(created.value.id, alice.userId);
  expect(deleted.ok).toBe(true);
  const empty = await listQuestionsForPair(pair.id, alice.userId);
  expect(empty.ok).toBe(true);
  if (!empty.ok) throw new Error("question list failed");
  expect(empty.value.length).toBe(0);
});

test("answer create and upsert", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");

  const created = await createAnswerForQuestion(question.value.id, bob.userId, blob);
  expect(created.ok).toBe(true);
  const updated = await upsertAnswerForQuestion(question.value.id, bob.userId, {
    ...blob,
    ciphertextB64: "bmV3"
  });
  expect(updated.ok).toBe(true);
  if (!updated.ok) throw new Error("answer update failed");
  expect(updated.value.updated).toBe(true);
});

test("weekly limit count excludes own questions", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const partnerQuestion = await createQuestionForPair(pair.id, alice.userId, blob);
  const ownQuestion = await createQuestionForPair(pair.id, bob.userId, blob);
  expect(partnerQuestion.ok).toBe(true);
  expect(ownQuestion.ok).toBe(true);
  if (!partnerQuestion.ok || !ownQuestion.ok) throw new Error("question create failed");
  await createAnswerForQuestion(partnerQuestion.value.id, bob.userId, blob);
  await createAnswerForQuestion(ownQuestion.value.id, bob.userId, blob);

  const now = Date.now();
  const count = await countWeeklyAnswers(pair.id, bob.userId, now - 7 * 86400000, now + 1);
  expect(count).toBe(1);
});

test("nonce reserve rejects replay and prunes expired entries", async () => {
  const id = newId();
  await createUser({
    id,
    code: "NONCE1",
    nickname: "Nonce",
    signPublicJwk: jwk,
    ecdhPublicRawB64: "pub-nonce"
  });

  const now = Date.now();
  const first = await reserveUserNonce(id, "n1", now);
  expect(first).toBeTruthy();
  const replay = await reserveUserNonce(id, "n1", now + 1);
  expect(replay).toBeNull();
  const afterExpiry = await reserveUserNonce(id, "n1", now + 11 * 60 * 1000);
  expect(afterExpiry).toBeTruthy();
});
