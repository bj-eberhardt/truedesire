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
  proposeWeeklyLimitForPair,
  seedQuestionsForPair,
  seedWeeklyQuestionsForPair
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
import { readSystemQuestions, readWeeklySystemQuestions } from "../src/services/systemQuestions.js";
import { assertSafeTestDatabase } from "./dbSafety.js";

const jwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };

const blob: EncryptedBlob = {
  ciphertextB64: "Y2lwaGVy",
  ivB64: "aXY=",
  aadB64: "YWFk",
  schemaVersion: 1
};

function tokens(
  overrides?: Partial<{ perfect: string[]; mixedMaybe: string[]; mutualMaybe: string[] }>
) {
  return { perfect: [], mixedMaybe: [], mutualMaybe: [], ...(overrides ?? {}) };
}

function requestMock() {
  return { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as never;
}

async function resetDb() {
  assertSafeTestDatabase();
  await query("truncate auth_nonces, answers, questions, pair_requests, pairs, users cascade");
  await query("delete from system_questions where catalog_version > 1");
  await query("delete from system_question_versions where version > 1");
}

async function user(nickname: string) {
  return registerAccount({ nickname, signPublicJwk: jwk, ecdhPublicRawB64: `pub-${nickname}` });
}

async function activePair(userA: string, userB: string): Promise<PairRecord> {
  return transaction((client) => insertPair(client, createPairRecordForUsers(userA, userB)));
}

async function createCurrentWeeklySet(pairId: string, userId: string) {
  const weekly = await readWeeklySystemQuestions(pairId, userId);
  expect(weekly.ok).toBe(true);
  if (!weekly.ok) throw new Error("weekly system questions failed");
  return weekly;
}

async function insertSystemQuestionForWeek(
  pairId: string,
  weekStart: number,
  createdAt = weekStart
) {
  const questionId = newId();
  await query(
    `insert into questions(
       id, pair_id, created_by, created_at, blob,
       system_question_id, system_catalog_version, system_week_start, intensity_level
     )
     values ($1, $2, 'computer', $3, $4::jsonb, $5, 1, $6, 3)`,
    [questionId, pairId, createdAt, JSON.stringify(blob), `test_${questionId}`, weekStart]
  );
  return questionId;
}

async function insertAnswerRow(
  questionId: string,
  pairId: string,
  userId: string,
  createdAt: number
) {
  await query(
    `insert into answers(
       id, question_id, pair_id, user_id, created_at, blob,
       match_tokens, policy_version, maybe_counts_as_match
     )
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 1, true)`,
    [newId(), questionId, pairId, userId, createdAt, JSON.stringify(blob), JSON.stringify(tokens())]
  );
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
  expect(Number(result.rows[0].count)).toBe(6);
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
      { id: "q_v2_only", text: "Neue Frage aus Version 2?", intensityLevel: 1 },
      { id: "q_v2_second", text: "Noch eine Frage aus Version 2?", intensityLevel: 5 }
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

test("system question catalog validation requires intensity levels", async () => {
  await expect(
    publishSystemQuestionVersion({
      version: 2,
      description: "Invalid catalog",
      questions: [{ id: "q_missing_intensity", text: "Fehlt ein Härtegrad?" }] as never
    })
  ).rejects.toThrow("intensityLevel");
});

test("config validates valid and invalid env", () => {
  const valid = parseConfig({
    DATABASE_URL: "postgres://user:pass@localhost:5432/app",
    PORT: "3001",
    DB_SSL: "false"
  });
  expect(valid.port).toBe(3001);
  expect(valid.defaultWeeklyLimit).toBe(7);
  expect(() => parseConfig({ DATABASE_URL: "not-a-url" })).toThrow(/Invalid server configuration/);
  expect(() =>
    parseConfig({
      DATABASE_URL: "postgres://user:pass@localhost:5432/app",
      WEEKLY_LIMIT_DEFAULT: "5"
    })
  ).toThrow(/Invalid server configuration/);
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

test("weekly limit proposal rejects nonzero limits below six", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);

  const rejected = await proposeWeeklyLimitForPair(pair.id, alice.userId, 5);
  expect(rejected.ok).toBe(false);
  if (rejected.ok) throw new Error("weekly limit proposal unexpectedly succeeded");
  expect(rejected.error.code).toBe(ApiErrorCode.BadRequest);

  const unlimited = await proposeWeeklyLimitForPair(pair.id, alice.userId, 0);
  expect(unlimited.ok).toBe(true);
  if (!unlimited.ok) throw new Error("unlimited weekly limit proposal failed");
  expect(unlimited.value.pending.limit).toBe(0);
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

test("weekly question set is stable and freezes catalog updates until next week", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const now = Date.UTC(2026, 6, 20, 12);

  const first = await readWeeklySystemQuestions(pair.id, alice.userId, now);
  expect(first.ok).toBe(true);
  if (!first.ok) throw new Error("first weekly read failed");
  expect(first.catalogVersion).toBe(1);
  expect(new Set(first.questions.map((question) => question.intensityLevel))).toEqual(
    new Set([1, 2, 3, 4, 5])
  );

  await publishSystemQuestionVersion({
    version: 2,
    description: "Midweek test catalog",
    questions: [
      { id: "q_new_soft", text: "Neue sanfte Frage?", intensityLevel: 1 },
      { id: "q_new_sensual", text: "Neue sinnliche Frage?", intensityLevel: 2 },
      { id: "q_new_sex", text: "Neue sexuelle Frage?", intensityLevel: 3 },
      { id: "q_new_play", text: "Neue Spielart-Frage?", intensityLevel: 4 },
      { id: "q_new_hard", text: "Neue harte Frage?", intensityLevel: 5 }
    ]
  });

  const sameWeek = await readWeeklySystemQuestions(pair.id, bob.userId, now + 86400000);
  expect(sameWeek.ok).toBe(true);
  if (!sameWeek.ok) throw new Error("same week read failed");
  expect(sameWeek.catalogVersion).toBe(1);
  expect(sameWeek.questions.map((question) => question.id)).toEqual(
    first.questions.map((question) => question.id)
  );

  const nextWeek = await readWeeklySystemQuestions(pair.id, alice.userId, now + 7 * 86400000);
  expect(nextWeek.ok).toBe(true);
  if (!nextWeek.ok) throw new Error("next week read failed");
  expect(nextWeek.catalogVersion).toBe(2);
  expect(nextWeek.questions.some((question) => question.id === "q_new_hard")).toBe(true);
});

test("weekly question set excludes system questions already answered by both partners", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const weekOne = Date.UTC(2026, 6, 20, 12);
  const weekTwo = weekOne + 7 * 86400000;
  await publishSystemQuestionVersion({
    version: 2,
    description: "Answered-system-filter catalog",
    questions: [
      { id: "q_filter_soft", text: "Sanft?", intensityLevel: 1 },
      { id: "q_filter_near", text: "Nah?", intensityLevel: 2 },
      { id: "q_filter_wish", text: "Wunsch?", intensityLevel: 3 },
      { id: "q_filter_play", text: "Spiel?", intensityLevel: 4 },
      { id: "q_filter_hard", text: "Hart?", intensityLevel: 5 },
      { id: "q_filter_extra_a", text: "Extra A?", intensityLevel: 1 },
      { id: "q_filter_extra_b", text: "Extra B?", intensityLevel: 2 }
    ]
  });

  const first = await readWeeklySystemQuestions(pair.id, alice.userId, weekOne);
  expect(first.ok).toBe(true);
  if (!first.ok) throw new Error("first weekly read failed");
  expect(first.questions).toHaveLength(7);
  await seedWeeklyQuestionsForPair(
    pair.id,
    alice.userId,
    first.weekStart,
    first.questions.map((question) => ({
      systemId: question.id,
      systemVersion: question.version,
      intensityLevel: question.intensityLevel,
      blob
    }))
  );
  const fullyAnsweredSystemId = first.questions[0].id;
  const halfAnsweredSystemId = first.questions[1].id;
  const seeded = await query<{ id: string; system_question_id: string }>(
    `select id, system_question_id
     from questions
     where pair_id = $1
       and system_question_id = any($2::text[])`,
    [pair.id, [fullyAnsweredSystemId, halfAnsweredSystemId]]
  );
  const questionIdBySystemId = new Map(
    seeded.rows.map((row) => [row.system_question_id, row.id] as const)
  );
  const fullyAnsweredQuestionId = questionIdBySystemId.get(fullyAnsweredSystemId);
  const halfAnsweredQuestionId = questionIdBySystemId.get(halfAnsweredSystemId);
  if (!fullyAnsweredQuestionId || !halfAnsweredQuestionId) {
    throw new Error("seeded system questions not found");
  }

  await insertAnswerRow(fullyAnsweredQuestionId, pair.id, alice.userId, weekOne + 1);
  await insertAnswerRow(fullyAnsweredQuestionId, pair.id, bob.userId, weekOne + 2);
  await insertAnswerRow(halfAnsweredQuestionId, pair.id, alice.userId, weekOne + 3);

  const next = await readWeeklySystemQuestions(pair.id, bob.userId, weekTwo);
  expect(next.ok).toBe(true);
  if (!next.ok) throw new Error("next weekly read failed");
  expect(next.questions.map((question) => question.id)).not.toContain(fullyAnsweredSystemId);
  expect(next.questions.map((question) => question.id)).toContain(halfAnsweredSystemId);
});

test("weekly question set includes at most two open manual questions", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const first = await createQuestionForPair(pair.id, alice.userId, blob);
  const second = await createQuestionForPair(pair.id, bob.userId, blob);
  const third = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(first.ok && second.ok && third.ok).toBe(true);
  if (!first.ok || !second.ok || !third.ok) throw new Error("question create failed");

  const weekly = await readWeeklySystemQuestions(pair.id, alice.userId, Date.UTC(2026, 6, 20, 12));
  expect(weekly.ok).toBe(true);
  if (!weekly.ok) throw new Error("weekly read failed");
  expect(weekly.ownQuestionIds).toEqual([first.value.id, second.value.id]);
  expect(weekly.ownQuestionIds).not.toContain(third.value.id);
});

test("weekly question set does not treat legacy computer questions as own questions", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const now = Date.UTC(2026, 6, 20, 12);

  const legacySeeded = await seedQuestionsForPair(pair.id, alice.userId, [{ blob }, { blob }]);
  expect(legacySeeded.ok).toBe(true);
  const legacyQuestions = await query<{ id: string }>(
    "select id from questions where pair_id = $1 and created_by = 'computer' and system_question_id is null order by created_at, id",
    [pair.id]
  );
  expect(legacyQuestions.rows).toHaveLength(2);

  const weekly = await readWeeklySystemQuestions(pair.id, alice.userId, now);
  expect(weekly.ok).toBe(true);
  if (!weekly.ok) throw new Error("weekly read failed");
  expect(weekly.ownQuestionIds).toEqual([]);

  await query(
    "update pair_weekly_question_sets set own_question_ids = $3::jsonb where pair_id = $1 and week_start = $2",
    [pair.id, weekly.weekStart, JSON.stringify(legacyQuestions.rows.map((question) => question.id))]
  );

  const normalized = await readWeeklySystemQuestions(pair.id, bob.userId, now);
  expect(normalized.ok).toBe(true);
  if (!normalized.ok) throw new Error("normalized weekly read failed");
  expect(normalized.ownQuestionIds).toEqual([]);
});

test("answer writes are limited to questions allowed in the current week", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const first = await createQuestionForPair(pair.id, alice.userId, blob);
  const second = await createQuestionForPair(pair.id, alice.userId, blob);
  const third = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(first.ok && second.ok && third.ok).toBe(true);
  if (!first.ok || !second.ok || !third.ok) throw new Error("question create failed");

  await createCurrentWeeklySet(pair.id, alice.userId);

  const allowed = await createAnswerForQuestion(first.value.id, bob.userId, blob);
  expect(allowed.ok).toBe(true);

  const blocked = await createAnswerForQuestion(third.value.id, bob.userId, blob);
  expect(blocked.ok).toBe(false);
  if (blocked.ok) throw new Error("blocked answer unexpectedly succeeded");
  expect(blocked.error.code).toBe(ApiErrorCode.WeeklyQuestionNotAllowed);
});

test("old questions without a partner answer stay blocked as catch-up questions", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  await createCurrentWeeklySet(pair.id, alice.userId);
  const oldQuestionId = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 5, 1));

  const blocked = await createAnswerForQuestion(oldQuestionId, bob.userId, blob);
  expect(blocked.ok).toBe(false);
  if (blocked.ok) throw new Error("old unanswered question unexpectedly succeeded");
  expect(blocked.error.code).toBe(ApiErrorCode.WeeklyQuestionNotAllowed);
});

test("old half-answered questions are answerable as catch-up questions and count this week", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  await createCurrentWeeklySet(pair.id, alice.userId);
  const oldQuestionId = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 5, 1));
  await insertAnswerRow(oldQuestionId, pair.id, alice.userId, Date.UTC(2026, 5, 2));

  const answered = await createAnswerForQuestion(oldQuestionId, bob.userId, blob);
  expect(answered.ok).toBe(true);

  const now = Date.now();
  const count = await countWeeklyAnswers(pair.id, bob.userId, now - 7 * 86400000, now + 1);
  expect(count).toBe(1);
});

test("existing own answers can be updated outside the current weekly plan until the partner answered", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  await createCurrentWeeklySet(pair.id, alice.userId);
  const oldQuestionId = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 5, 1));
  await insertAnswerRow(oldQuestionId, pair.id, bob.userId, Date.UTC(2026, 5, 2));

  const updated = await upsertAnswerForQuestion(oldQuestionId, bob.userId, {
    ...blob,
    ciphertextB64: "dXBkYXRlZA=="
  });
  expect(updated.ok).toBe(true);
  if (!updated.ok) throw new Error("old own answer update failed");
  expect(updated.value.updated).toBe(true);
});

test("catch-up answers are rejected when the weekly limit is already reached", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  await query("update pairs set weekly_limit = 6 where id = $1", [pair.id]);
  await createCurrentWeeklySet(pair.id, alice.userId);

  const now = Date.now();
  for (let i = 0; i < 6; i += 1) {
    const questionId = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 6, 1), now + i);
    await insertAnswerRow(questionId, pair.id, bob.userId, now + i);
  }
  const oldQuestionId = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 5, 1));
  await insertAnswerRow(oldQuestionId, pair.id, alice.userId, Date.UTC(2026, 5, 2));

  const blocked = await createAnswerForQuestion(oldQuestionId, bob.userId, blob);
  expect(blocked.ok).toBe(false);
  if (blocked.ok) throw new Error("catch-up answer unexpectedly succeeded");
  expect(blocked.error.code).toBe(ApiErrorCode.WeeklyLimitReached);
});

test("pair details include the partner's current weekly answer count", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const now = Date.now();
  const aliceQuestionA = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 6, 1), now);
  const aliceQuestionB = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 6, 1), now + 1);
  const bobQuestion = await insertSystemQuestionForWeek(pair.id, Date.UTC(2026, 6, 1), now + 2);
  await insertAnswerRow(aliceQuestionA, pair.id, bob.userId, now);
  await insertAnswerRow(aliceQuestionB, pair.id, bob.userId, now + 1);
  await query("update questions set created_by = $2 where id = $1", [bobQuestion, bob.userId]);
  await insertAnswerRow(bobQuestion, pair.id, alice.userId, now + 2);

  const details = await getPairDetails(pair.id, alice.userId);
  expect(details.ok).toBe(true);
  if (!details.ok) throw new Error("pair details failed");
  expect(details.value.usage.answeredThisWeek).toBe(1);
  expect(details.value.usage.partnerAnsweredThisWeek).toBe(2);
});

test("weekly system question seeding validates the frozen plan and is idempotent", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const weekly = await createCurrentWeeklySet(pair.id, alice.userId);
  const items = weekly.questions.map((question) => ({
    systemId: question.id,
    systemVersion: question.version,
    intensityLevel: question.intensityLevel,
    blob
  }));

  const seeded = await seedWeeklyQuestionsForPair(pair.id, alice.userId, weekly.weekStart, items);
  expect(seeded.ok).toBe(true);
  if (!seeded.ok) throw new Error("weekly seed failed");
  expect(seeded.value.alreadySeeded).toBe(false);

  const reseeded = await seedWeeklyQuestionsForPair(pair.id, bob.userId, weekly.weekStart, items);
  expect(reseeded.ok).toBe(true);
  if (!reseeded.ok) throw new Error("weekly reseed failed");
  expect(reseeded.value.alreadySeeded).toBe(true);

  const stored = await query<{
    system_question_id: string;
    system_week_start: string;
    intensity_level: string;
  }>(
    `select system_question_id, system_week_start::text, intensity_level::text
     from questions
     where pair_id = $1 and system_question_id is not null`,
    [pair.id]
  );
  expect(stored.rows).toHaveLength(weekly.questions.length);
  expect(stored.rows.every((row) => Number(row.system_week_start) === weekly.weekStart)).toBe(true);

  const badSeed = await seedWeeklyQuestionsForPair(pair.id, alice.userId, weekly.weekStart, [
    items[0]
  ]);
  expect(badSeed.ok).toBe(false);
  if (badSeed.ok) throw new Error("bad seed unexpectedly succeeded");
  expect(badSeed.error.code).toBe(ApiErrorCode.BadSystemQuestions);
});

test("seeded weekly system questions keep metadata when checking answer access", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const weekly = await createCurrentWeeklySet(pair.id, alice.userId);
  await seedWeeklyQuestionsForPair(
    pair.id,
    alice.userId,
    weekly.weekStart,
    weekly.questions.map((question) => ({
      systemId: question.id,
      systemVersion: question.version,
      intensityLevel: question.intensityLevel,
      blob
    }))
  );
  const stored = await query<{ id: string }>(
    "select id from questions where pair_id = $1 and system_question_id = $2",
    [pair.id, weekly.questions[0].id]
  );

  const answered = await createAnswerForQuestion(stored.rows[0].id, bob.userId, blob);
  expect(answered.ok).toBe(true);
});

test("answer create and upsert", async () => {
  const alice = await user("Alice");
  const bob = await user("Bob");
  const pair = await activePair(alice.userId, bob.userId);
  const question = await createQuestionForPair(pair.id, alice.userId, blob);
  expect(question.ok).toBe(true);
  if (!question.ok) throw new Error("question create failed");
  await createCurrentWeeklySet(pair.id, alice.userId);

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
  await createCurrentWeeklySet(pair.id, alice.userId);

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
  await createCurrentWeeklySet(pair.id, alice.userId);

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
  await createCurrentWeeklySet(pair.id, alice.userId);

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
  await createCurrentWeeklySet(pair.id, alice.userId);

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
  await createCurrentWeeklySet(pair.id, alice.userId);
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
  expect(first).toBe(true);
  const replay = await reserveUserNonce(id, "n1", now + 1);
  expect(replay).toBe(false);
  const afterExpiry = await reserveUserNonce(id, "n1", now + 11 * 60 * 1000);
  expect(afterExpiry).toBe(true);
});
