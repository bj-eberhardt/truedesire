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
  getMatchPolicyForPair,
  listAnswersForPair,
  listPrivateMatchesForPair,
  proposeMatchPolicyForPair,
  respondMatchPolicyForPair,
  setMatchPolicyForPair,
  upsertAnswerForQuestion
} from "../src/services/answerService.js";
import { registerAccount } from "../src/services/authService.js";
import {
  createPairRecordForUsers,
  getPairDetails,
  seedQuestionsForPair
} from "../src/services/pairService.js";
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
import { publishSystemQuestionVersion } from "../src/repositories/systemQuestionRepository.js";
import type { EncryptedBlob, PairRecord } from "../src/storage/db.js";
import { readSystemQuestions } from "../src/services/systemQuestions.js";

const jwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };

const blob: EncryptedBlob = {
  ciphertextB64: "Y2lwaGVy",
  ivB64: "aXY=",
  aadB64: "YWFk",
  schemaVersion: 1
};

function tokens(overrides?: Partial<{ perfect: string[]; mixedMaybe: string[]; mutualMaybe: string[] }>) {
  return { perfect: [], mixedMaybe: [], mutualMaybe: [], ...(overrides ?? {}) };
}

function requestMock() {
  return { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as never;
}

async function resetDb() {
  await query("delete from system_questions where catalog_version > 1");
  await query("delete from system_question_versions where version > 1");
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
  expect(Number(result.rows[0].count)).toBe(5);
});

test("system question migration seeds version 1", async () => {
  const version = await query<{ version: string }>(
    "select version::text from system_question_versions where version = 1"
  );
  expect(version.rows[0].version).toBe("1");

  const questions = await query<{ count: string }>(
    "select count(*)::text from system_questions where catalog_version = 1"
  );
  expect(Number(questions.rows[0].count)).toBeGreaterThan(0);
});

test("system questions API reads latest version and keeps historical verification hashes", async () => {
  const initial = await readSystemQuestions();
  expect(initial.ok).toBe(true);
  if (!initial.ok) throw new Error("initial system questions failed");
  expect(initial.catalogVersion).toBe(1);
  expect(initial.questions[0].version).toBe(1);
  const initialQuestionId = initial.questions[0].id;

  await publishSystemQuestionVersion({
    version: 2,
    description: "Integration test catalog",
    questions: [
      { id: "q_v2_only", text: "Neue Frage aus Version 2?" },
      { id: "q_v2_second", text: "Noch eine Frage aus Version 2?" }
    ]
  });

  const latest = await readSystemQuestions();
  expect(latest.ok).toBe(true);
  if (!latest.ok) throw new Error("latest system questions failed");
  expect(latest.catalogVersion).toBe(2);
  expect(latest.questions.map((q) => q.id)).toEqual(["q_v2_only", "q_v2_second"]);
  expect(latest.questions.every((q) => q.version === 2)).toBe(true);
  expect(
    latest.verificationCatalog.some((q) => q.id === initialQuestionId && q.version === 1)
  ).toBe(true);
  expect(latest.verificationCatalog.some((q) => q.id === "q_v2_only" && q.version === 2)).toBe(
    true
  );
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

test("system question seed stores encrypted pair questions only", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);

  const seeded = await seedQuestionsForPair(pair.id, alice.userId, [{ blob }]);
  expect(seeded.ok).toBe(true);
  if (!seeded.ok) throw new Error("system seed failed");

  const questions = await query<{ created_by: string; blob: EncryptedBlob; text: string | null }>(
    "select created_by, blob, blob->>'text' as text from questions where pair_id = $1",
    [pair.id]
  );
  expect(questions.rows).toHaveLength(1);
  expect(questions.rows[0].created_by).toBe("computer");
  expect(questions.rows[0].blob).toEqual(blob);
  expect(questions.rows[0].text).toBeNull();
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

test("answer lists expose only own blobs and matches use opaque token intersection", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");

  const aliceBlob = { ...blob, ciphertextB64: "YWxpY2U=" };
  const bobBlob = { ...blob, ciphertextB64: "Ym9i" };
  await createAnswerForQuestion(
    question.value.id,
    alice.userId,
    aliceBlob,
    tokens({ perfect: ["shared-token"] }),
    1,
    true
  );
  await createAnswerForQuestion(
    question.value.id,
    bob.userId,
    bobBlob,
    tokens({ perfect: ["shared-token"] }),
    1,
    true
  );

  const aliceAnswers = await listAnswersForPair(pair.id, alice.userId);
  expect(aliceAnswers.ok).toBe(true);
  if (!aliceAnswers.ok) throw new Error("answer list failed");
  expect(aliceAnswers.value).toHaveLength(1);
  expect(aliceAnswers.value[0].userId).toBe(alice.userId);
  expect(aliceAnswers.value[0].blob).toEqual(aliceBlob);

  const aliceMatches = await listPrivateMatchesForPair(pair.id, alice.userId);
  expect(aliceMatches.ok).toBe(true);
  if (!aliceMatches.ok) throw new Error("match list failed");
  expect(aliceMatches.value).toEqual([
    { questionId: question.value.id, createdAt: question.value.createdAt, grade: "perfect" }
  ]);
});

test("opaque token mismatch prevents a private match", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");

  await createAnswerForQuestion(
    question.value.id,
    alice.userId,
    blob,
    tokens({ perfect: ["alice-token"] }),
    1,
    true
  );
  await createAnswerForQuestion(
    question.value.id,
    bob.userId,
    blob,
    tokens({ perfect: ["bob-token"] }),
    1,
    true
  );

  const matches = await listPrivateMatchesForPair(pair.id, alice.userId);
  expect(matches.ok).toBe(true);
  if (!matches.ok) throw new Error("match list failed");
  expect(matches.value).toEqual([]);
});

test("stricter match policy prunes existing maybe tokens", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");

  await createAnswerForQuestion(
    question.value.id,
    alice.userId,
    blob,
    tokens({ mixedMaybe: ["maybe-token"] }),
    1,
    true
  );
  await createAnswerForQuestion(
    question.value.id,
    bob.userId,
    blob,
    tokens({ mixedMaybe: ["maybe-token"] }),
    1,
    true
  );

  const beforePolicyChange = await listPrivateMatchesForPair(pair.id, alice.userId);
  expect(beforePolicyChange.ok).toBe(true);
  if (!beforePolicyChange.ok) throw new Error("match list failed");
  expect(beforePolicyChange.value[0]?.grade).toBe("maybe");

  const policy = await setMatchPolicyForPair(pair.id, alice.userId, "perfectOnly");
  expect(policy.ok).toBe(true);

  const afterPolicyChange = await listPrivateMatchesForPair(pair.id, alice.userId);
  expect(afterPolicyChange.ok).toBe(true);
  if (!afterPolicyChange.ok) throw new Error("match list failed");
  expect(afterPolicyChange.value).toEqual([]);
});

test("match policy proposal requires partner acceptance and applies to both users", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");

  await createAnswerForQuestion(
    question.value.id,
    alice.userId,
    blob,
    tokens({ mixedMaybe: ["maybe-token"] }),
    1,
    true
  );
  await createAnswerForQuestion(
    question.value.id,
    bob.userId,
    blob,
    tokens({ mixedMaybe: ["maybe-token"] }),
    1,
    true
  );

  const proposal = await proposeMatchPolicyForPair(pair.id, alice.userId, "perfectOnly");
  expect(proposal.ok).toBe(true);
  if (!proposal.ok) throw new Error("proposal failed");

  const ownAccept = await respondMatchPolicyForPair(
    pair.id,
    alice.userId,
    proposal.value.pending.id,
    "accept"
  );
  expect(ownAccept.ok).toBe(false);
  if (ownAccept.ok) throw new Error("own proposal accepted unexpectedly");
  expect(ownAccept.error.code).toBe(ApiErrorCode.CannotRespondOwnProposal);

  const accepted = await respondMatchPolicyForPair(
    pair.id,
    bob.userId,
    proposal.value.pending.id,
    "accept"
  );
  expect(accepted.ok).toBe(true);
  if (!accepted.ok) throw new Error("accept failed");
  expect(accepted.value.policy).toBe("perfectOnly");

  const alicePolicy = await getMatchPolicyForPair(pair.id, alice.userId);
  const bobPolicy = await getMatchPolicyForPair(pair.id, bob.userId);
  expect(alicePolicy.ok && alicePolicy.value.policy).toBe("perfectOnly");
  expect(bobPolicy.ok && bobPolicy.value.policy).toBe("perfectOnly");

  const matches = await listPrivateMatchesForPair(pair.id, alice.userId);
  expect(matches.ok).toBe(true);
  if (!matches.ok) throw new Error("match list failed");
  expect(matches.value).toEqual([]);
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
