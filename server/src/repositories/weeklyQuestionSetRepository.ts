import { createHash, randomUUID } from "node:crypto";
import { transaction, type DbClient } from "../db/pool.js";
import type { ActivePairFailure } from "../domain/results.js";
import type { EncryptedBlob, PairRecord, QuestionRecord } from "../storage/db.js";
import { getPairAccess } from "./accessRepository.js";
import type { QuestionRow } from "./rowMapping.js";

const INTENSITY_LEVELS = [1, 2, 3, 4, 5] as const;
const OWN_QUESTION_LIMIT = 2;
const UNLIMITED_WEEKLY_SYSTEM_QUESTIONS = 10;
const MIN_WEEKLY_SYSTEM_QUESTIONS = 6;

export type WeeklySystemQuestionRecord = {
  id: string;
  version: number;
  text: string;
  sha256B64: string;
  intensityLevel: number;
};

export type WeeklyQuestionSet = {
  pairId: string;
  weekStart: number;
  catalogVersion: number;
  systemQuestionIds: string[];
  ownQuestionIds: string[];
  createdAt: number;
};

type WeeklyQuestionSetRow = {
  pair_id: string;
  week_start: string | number;
  catalog_version: string | number;
  system_question_ids: unknown;
  own_question_ids: unknown;
  created_at: string | number;
};

type SystemQuestionRow = {
  question_id: string;
  catalog_version: string | number;
  text: string;
  sha256_b64: string;
  intensity_level: string | number;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapWeeklyQuestionSet(row: WeeklyQuestionSetRow): WeeklyQuestionSet {
  return {
    pairId: row.pair_id,
    weekStart: Number(row.week_start),
    catalogVersion: Number(row.catalog_version),
    systemQuestionIds: stringArray(row.system_question_ids),
    ownQuestionIds: stringArray(row.own_question_ids),
    createdAt: Number(row.created_at)
  };
}

function mapSystemQuestion(row: SystemQuestionRow): WeeklySystemQuestionRecord {
  return {
    id: row.question_id,
    version: Number(row.catalog_version),
    text: row.text,
    sha256B64: row.sha256_b64,
    intensityLevel: Number(row.intensity_level)
  };
}

function stableScore(seed: string, questionId: string): string {
  return createHash("sha256").update(`${seed}|${questionId}`, "utf8").digest("hex");
}

function weeklySystemQuestionCount(weeklyLimit: number, availableCount: number): number {
  const requested =
    weeklyLimit === 0
      ? UNLIMITED_WEEKLY_SYSTEM_QUESTIONS
      : Math.max(MIN_WEEKLY_SYSTEM_QUESTIONS, weeklyLimit);
  return Math.min(requested, availableCount);
}

function selectSystemQuestionIds(
  pair: PairRecord,
  weekStart: number,
  catalogVersion: number,
  questions: WeeklySystemQuestionRecord[]
): string[] {
  const targetCount = weeklySystemQuestionCount(pair.weeklyLimit, questions.length);
  const selected = new Set<string>();
  const byLevel = new Map<number, WeeklySystemQuestionRecord[]>();
  const seed = `pair:${pair.id}|week:${weekStart}|catalog:${catalogVersion}`;

  for (const level of INTENSITY_LEVELS) {
    byLevel.set(
      level,
      questions
        .filter((question) => question.intensityLevel === level)
        .sort((a, b) =>
          stableScore(`${seed}|level:${level}`, a.id).localeCompare(
            stableScore(`${seed}|level:${level}`, b.id)
          )
        )
    );
  }

  for (const level of INTENSITY_LEVELS) {
    const question = byLevel.get(level)?.[0];
    if (question && selected.size < targetCount) selected.add(question.id);
  }

  let index = 1;
  while (selected.size < targetCount) {
    let added = false;
    for (const level of INTENSITY_LEVELS) {
      const question = byLevel.get(level)?.[index];
      if (!question || selected.has(question.id)) continue;
      selected.add(question.id);
      added = true;
      if (selected.size >= targetCount) break;
    }
    if (!added) break;
    index += 1;
  }

  return [...selected];
}

async function latestCatalogVersionInClient(client: DbClient): Promise<number | null> {
  const result = await client.query<{ version: string | number | null }>(
    "select max(version) as version from system_question_versions"
  );
  return result.rows[0]?.version === null || result.rows[0]?.version === undefined
    ? null
    : Number(result.rows[0].version);
}

async function listSystemQuestionsForCatalogInClient(
  client: DbClient,
  catalogVersion: number
): Promise<WeeklySystemQuestionRecord[]> {
  const result = await client.query<SystemQuestionRow>(
    `select question_id, catalog_version, text, sha256_b64, intensity_level
     from system_questions
     where catalog_version = $1
     order by position`,
    [catalogVersion]
  );
  return result.rows.map(mapSystemQuestion);
}

async function listOpenSystemQuestionsForPairCatalogInClient(
  client: DbClient,
  pairId: string,
  catalogVersion: number
): Promise<WeeklySystemQuestionRecord[]> {
  const result = await client.query<SystemQuestionRow>(
    `select sq.question_id, sq.catalog_version, sq.text, sq.sha256_b64, sq.intensity_level
     from system_questions sq
     where sq.catalog_version = $2
       and not exists (
         select 1
         from questions q
         join answers a on a.question_id = q.id
         where q.pair_id = $1
           and q.system_question_id = sq.question_id
         group by q.id
         having count(distinct a.user_id) >= 2
       )
     order by sq.position`,
    [pairId, catalogVersion]
  );
  return result.rows.map(mapSystemQuestion);
}

async function listOpenManualQuestionIdsInClient(
  client: DbClient,
  pairId: string
): Promise<string[]> {
  const result = await client.query<{ id: string }>(
    `select q.id
     from questions q
     left join answers a on a.question_id = q.id
     where q.pair_id = $1
       and q.system_question_id is null
       and q.created_by <> 'computer'
     group by q.id, q.created_at
     having count(a.id) < 2
     order by q.created_at asc, q.id asc
     limit $2`,
    [pairId, OWN_QUESTION_LIMIT]
  );
  return result.rows.map((row) => row.id);
}

async function listAllowedManualQuestionIdsInClient(
  client: DbClient,
  pairId: string,
  questionIds: string[]
): Promise<string[]> {
  if (questionIds.length === 0) return [];
  const result = await client.query<{ id: string }>(
    `select id
     from questions
     where pair_id = $1
       and id = any($2::text[])
       and system_question_id is null
       and created_by <> 'computer'
     order by array_position($2::text[], id)`,
    [pairId, questionIds]
  );
  return result.rows.map((row) => row.id);
}

async function findWeeklyQuestionSetInClient(
  client: DbClient,
  pairId: string,
  weekStart: number
): Promise<WeeklyQuestionSet | null> {
  const result = await client.query<WeeklyQuestionSetRow>(
    "select * from pair_weekly_question_sets where pair_id = $1 and week_start = $2",
    [pairId, weekStart]
  );
  return result.rows[0] ? mapWeeklyQuestionSet(result.rows[0]) : null;
}

async function normalizeWeeklyQuestionSetInClient(
  client: DbClient,
  set: WeeklyQuestionSet
): Promise<WeeklyQuestionSet> {
  const ownQuestionIds = await listAllowedManualQuestionIdsInClient(
    client,
    set.pairId,
    set.ownQuestionIds
  );
  if (ownQuestionIds.length === set.ownQuestionIds.length) return set;
  await client.query(
    `update pair_weekly_question_sets
     set own_question_ids = $3::jsonb
     where pair_id = $1 and week_start = $2`,
    [set.pairId, set.weekStart, JSON.stringify(ownQuestionIds)]
  );
  return { ...set, ownQuestionIds };
}

export async function getOrCreateWeeklyQuestionSetForPair(
  pairId: string,
  userId: string,
  weekStart: number,
  now: number
): Promise<
  | { kind: "ok"; set: WeeklyQuestionSet; questions: WeeklySystemQuestionRecord[] }
  | { kind: ActivePairFailure }
  | { kind: "system_questions_unavailable" }
> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return { kind: "missing" };
    if (access.kind === "forbidden") return { kind: "forbidden" };
    if (access.partnerDeleted) return { kind: "partner_deleted" };
    if (access.pair.status !== "active") return { kind: "pair_not_active" };

    const existing = await findWeeklyQuestionSetInClient(client, pairId, weekStart);
    if (existing) {
      const set = await normalizeWeeklyQuestionSetInClient(client, existing);
      return {
        kind: "ok",
        set,
        questions: await listSystemQuestionsForCatalogInClient(client, set.catalogVersion)
      };
    }

    const catalogVersion = await latestCatalogVersionInClient(client);
    if (!catalogVersion) return { kind: "system_questions_unavailable" };
    const questions = await listOpenSystemQuestionsForPairCatalogInClient(
      client,
      pairId,
      catalogVersion
    );
    const systemQuestionIds = selectSystemQuestionIds(
      access.pair,
      weekStart,
      catalogVersion,
      questions
    );
    const ownQuestionIds = await listOpenManualQuestionIdsInClient(client, pairId);

    const inserted = await client.query<WeeklyQuestionSetRow>(
      `insert into pair_weekly_question_sets(
         pair_id, week_start, catalog_version, system_question_ids, own_question_ids, created_at
       )
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       on conflict (pair_id, week_start) do nothing
       returning *`,
      [
        pairId,
        weekStart,
        catalogVersion,
        JSON.stringify(systemQuestionIds),
        JSON.stringify(ownQuestionIds),
        now
      ]
    );

    const set = inserted.rows[0]
      ? mapWeeklyQuestionSet(inserted.rows[0])
      : await findWeeklyQuestionSetInClient(client, pairId, weekStart);
    if (!set) return { kind: "system_questions_unavailable" };
    return { kind: "ok", set: await normalizeWeeklyQuestionSetInClient(client, set), questions };
  });
}

export async function seedWeeklySystemQuestionsForPair(
  pairId: string,
  userId: string,
  weekStart: number,
  items: Array<{
    systemId: string;
    systemVersion: number;
    intensityLevel: number;
    blob: EncryptedBlob;
  }>,
  now: number
): Promise<
  | { kind: "ok"; alreadySeeded: boolean }
  | { kind: ActivePairFailure }
  | { kind: "system_questions_unavailable" }
  | { kind: "bad_system_questions" }
> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return { kind: "missing" };
    if (access.kind === "forbidden") return { kind: "forbidden" };
    if (access.partnerDeleted) return { kind: "partner_deleted" };
    if (access.pair.status !== "active") return { kind: "pair_not_active" };

    const set = await findWeeklyQuestionSetInClient(client, pairId, weekStart);
    if (!set) return { kind: "system_questions_unavailable" };
    const expected = new Set(set.systemQuestionIds);
    const received = new Set(items.map((item) => item.systemId));
    if (expected.size !== received.size || [...expected].some((id) => !received.has(id))) {
      return { kind: "bad_system_questions" };
    }
    if (items.some((item) => item.systemVersion !== set.catalogVersion)) {
      return { kind: "bad_system_questions" };
    }

    let insertedCount = 0;
    for (const item of items) {
      if (!expected.has(item.systemId) || item.intensityLevel < 1 || item.intensityLevel > 5) {
        return { kind: "bad_system_questions" };
      }
      const inserted = await client.query<QuestionRow>(
        `insert into questions(
           id, pair_id, created_by, created_at, blob,
           system_question_id, system_catalog_version, system_week_start, intensity_level
         )
         values (
           $8, $1, 'computer', $2, $3,
           $4, $5, $6, $7
         )
         on conflict do nothing
         returning *`,
        [
          pairId,
          now,
          item.blob,
          item.systemId,
          set.catalogVersion,
          weekStart,
          item.intensityLevel,
          randomUUID()
        ]
      );
      if (inserted.rows[0]) insertedCount += 1;
    }

    return { kind: "ok", alreadySeeded: insertedCount === 0 };
  });
}

export async function isQuestionAllowedForCurrentWeekInClient(
  client: DbClient,
  question: QuestionRecord,
  userId: string,
  weekStart: number
): Promise<boolean> {
  const allowance = await getQuestionWeeklyAllowanceInClient(client, question, userId, weekStart);
  return allowance.kind !== "blocked";
}

export async function getQuestionWeeklyAllowanceInClient(
  client: DbClient,
  question: QuestionRecord,
  userId: string,
  weekStart: number
): Promise<
  { kind: "weekly" } | { kind: "catchup" } | { kind: "own_authored" } | { kind: "blocked" }
> {
  const set = await findWeeklyQuestionSetInClient(client, question.pairId, weekStart);
  if (
    set &&
    question.systemQuestionId &&
    question.systemCatalogVersion === set.catalogVersion &&
    question.systemWeekStart === weekStart &&
    set.systemQuestionIds.includes(question.systemQuestionId)
  ) {
    return { kind: "weekly" };
  }
  if (set && question.createdBy !== "computer" && set.ownQuestionIds.includes(question.id)) {
    return { kind: "weekly" };
  }

  const catchup = await client.query<{ partner_answered: string; mine_answered: string }>(
    `select
       count(*) filter (where user_id <> $2)::text as partner_answered,
       count(*) filter (where user_id = $2)::text as mine_answered
     from answers
     where question_id = $1`,
    [question.id, userId]
  );
  return (
    Number(catchup.rows[0]?.partner_answered ?? 0) > 0 &&
    Number(catchup.rows[0]?.mine_answered ?? 0) === 0
  )
    ? { kind: "catchup" }
    : question.createdBy === userId
      ? { kind: "own_authored" }
      : { kind: "blocked" };
}
