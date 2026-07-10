import path from "node:path";
import { FileStore } from "./fileStore.js";

export type UserRecord = {
  id: string;
  code: string;
  nickname: string;
  deletedAt: number | null;
  signPublicJwk: JsonWebKey;
  ecdhPublicRawB64: string;
  createdAt: number;
};

export type PairRecord = {
  id: string;
  userA: string;
  userB: string | null;
  confirmA: boolean;
  confirmB: boolean;
  status: "pending" | "active" | "ended";
  weeklyLimit: number;
  weeklyLimitProposals: { [userId: string]: number | undefined };
  weeklyLimitPending: { id: string; proposedBy: string; limit: number; createdAt: number } | null;
  seededSystemQuestionsAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PairRequestRecord = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: number;
  updatedAt: number;
};

export type EncryptedBlob = {
  ciphertextB64: string;
  ivB64: string;
  aadB64: string;
  schemaVersion: number;
};

export type QuestionRecord = {
  id: string;
  pairId: string;
  createdBy: string;
  createdAt: number;
  blob: EncryptedBlob;
};

export type AnswerRecord = {
  id: string;
  questionId: string;
  pairId: string;
  userId: string;
  createdAt: number;
  updatedAt?: number;
  blob: EncryptedBlob;
};

export type DatabaseShape = {
  users: UserRecord[];
  pairs: PairRecord[];
  pairRequests: PairRequestRecord[];
  questions: QuestionRecord[];
  answers: AnswerRecord[];
  nonces: { [userId: string]: { nonce: string; expiresAt: number }[] };
};

const baseDir = process.env.DATA_DIR || path.join(process.cwd(), "server", "data");

export const dbStore = new FileStore<DatabaseShape>(baseDir, "db.json", {
  users: [],
  pairs: [],
  pairRequests: [],
  questions: [],
  answers: [],
  nonces: {}
});
