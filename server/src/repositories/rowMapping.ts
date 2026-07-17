import type {
  AnswerRecord,
  EncryptedBlob,
  MatchTokenSet,
  PairRecord,
  PairRequestRecord,
  UserRecord
} from "../storage/db.js";

export type UserRow = {
  id: string;
  code: string;
  nickname: string;
  deleted_at: string | number | null;
  sign_public_jwk: JsonWebKey;
  ecdh_public_raw_b64: string;
  created_at: string | number;
};

export type PairRow = {
  id: string;
  user_a: string;
  user_b: string | null;
  confirm_a: boolean;
  confirm_b: boolean;
  status: PairRecord["status"];
  weekly_limit: string | number;
  weekly_limit_pending: PairRecord["weeklyLimitPending"];
  match_policy_pending: PairRecord["matchPolicyPending"];
  seeded_system_questions_at: string | number | null;
  created_at: string | number;
  updated_at: string | number;
};

export type PairRequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: PairRequestRecord["status"];
  created_at: string | number;
  updated_at: string | number;
};

export type QuestionRow = {
  id: string;
  pair_id: string;
  created_by: string;
  created_at: string | number;
  blob: EncryptedBlob;
};

export type AnswerRow = {
  id: string;
  question_id: string;
  pair_id: string;
  user_id: string;
  created_at: string | number;
  updated_at: string | number | null;
  blob: EncryptedBlob;
  match_tokens: unknown;
  policy_version: string | number;
  maybe_counts_as_match: boolean | null;
};

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  return Number(value);
}

function mapMatchTokenSet(value: unknown): MatchTokenSet {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { perfect: [], mixedMaybe: [], mutualMaybe: [] };
  }
  const record = value as Record<string, unknown>;
  return {
    perfect: Array.isArray(record.perfect)
      ? record.perfect.filter((token): token is string => typeof token === "string")
      : [],
    mixedMaybe: Array.isArray(record.mixedMaybe)
      ? record.mixedMaybe.filter((token): token is string => typeof token === "string")
      : [],
    mutualMaybe: Array.isArray(record.mutualMaybe)
      ? record.mutualMaybe.filter((token): token is string => typeof token === "string")
      : []
  };
}

export function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    code: row.code,
    nickname: row.nickname,
    deletedAt: toNumber(row.deleted_at),
    signPublicJwk: row.sign_public_jwk,
    ecdhPublicRawB64: row.ecdh_public_raw_b64,
    createdAt: Number(row.created_at)
  };
}

export function mapPair(row: PairRow): PairRecord {
  return {
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    confirmA: row.confirm_a,
    confirmB: row.confirm_b,
    status: row.status,
    weeklyLimit: Number(row.weekly_limit),
    weeklyLimitProposals: {},
    weeklyLimitPending: row.weekly_limit_pending ?? null,
    matchPolicyPending: row.match_policy_pending ?? null,
    seededSystemQuestionsAt: toNumber(row.seeded_system_questions_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at)
  };
}

export function mapPairRequest(row: PairRequestRow): PairRequestRecord {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at)
  };
}

export function mapQuestion(row: QuestionRow) {
  return {
    id: row.id,
    pairId: row.pair_id,
    createdBy: row.created_by,
    createdAt: Number(row.created_at),
    blob: row.blob
  };
}

export function mapAnswer(row: AnswerRow): AnswerRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    pairId: row.pair_id,
    userId: row.user_id,
    createdAt: Number(row.created_at),
    updatedAt: row.updated_at === null ? undefined : Number(row.updated_at),
    blob: row.blob,
    matchTokens: mapMatchTokenSet(row.match_tokens),
    policyVersion: Number(row.policy_version),
    maybeCountsAsMatch: row.maybe_counts_as_match
  };
}
