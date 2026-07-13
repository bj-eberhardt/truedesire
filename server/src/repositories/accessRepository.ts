import { query, type DbClient } from "../db/pool.js";
import type { EncryptedBlob, PairRecord, QuestionRecord } from "../storage/db.js";
import { mapPair, mapQuestion, type PairRow } from "./rowMapping.js";

type ClientQuery = typeof query;

type PairAccessRow = PairRow & { partner_deleted_at: string | number | null };

type QuestionAccessRow = PairAccessRow & {
  q_id: string;
  pair_id: string;
  created_by: string;
  q_created_at: string | number;
  q_blob: EncryptedBlob;
};

export type PairAccess =
  | { kind: "missing" }
  | { kind: "forbidden"; pair: PairRecord }
  | { kind: "ok"; pair: PairRecord; partnerDeleted: boolean };

export type QuestionAccess =
  | { kind: "missing" }
  | { kind: "forbidden"; pair?: PairRecord; question?: QuestionRecord }
  | { kind: "ok"; pair: PairRecord; question: QuestionRecord; partnerDeleted: boolean };

export async function getPairAccess(
  client: DbClient | null,
  pairId: string,
  userId: string,
  opts: { forUpdate?: boolean } = {}
): Promise<PairAccess> {
  const runner = client ?? { query };
  const result = await runner.query<PairAccessRow>(
    `select p.*, partner.deleted_at as partner_deleted_at
     from pairs p
     left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
     where p.id = $1
     ${opts.forUpdate ? "for update of p" : ""}`,
    [pairId, userId]
  );
  const row = result.rows[0];
  if (!row) return { kind: "missing" };

  const pair = mapPair(row);
  if (![pair.userA, pair.userB].includes(userId)) return { kind: "forbidden", pair };
  return { kind: "ok", pair, partnerDeleted: row.partner_deleted_at !== null };
}

export async function getQuestionAccess(
  clientQuery: ClientQuery,
  questionId: string,
  userId: string
): Promise<QuestionAccess> {
  const result = await clientQuery<QuestionAccessRow>(
    `select
       q.id as q_id, q.pair_id, q.created_by, q.created_at as q_created_at, q.blob as q_blob,
       p.*,
       partner.deleted_at as partner_deleted_at
     from questions q
     join pairs p on p.id = q.pair_id
     left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
     where q.id = $1`,
    [questionId, userId]
  );
  const row = result.rows[0];
  if (!row) return { kind: "missing" };

  const pair = mapPair(row);
  const question = mapQuestion({
    id: row.q_id,
    pair_id: row.pair_id,
    created_by: row.created_by,
    created_at: row.q_created_at,
    blob: row.q_blob
  });
  if (![pair.userA, pair.userB].includes(userId)) {
    return { kind: "forbidden", pair, question };
  }
  return { kind: "ok", pair, question, partnerDeleted: row.partner_deleted_at !== null };
}
