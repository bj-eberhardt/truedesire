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
  matchPolicyPending: {
    id: string;
    proposedBy: string;
    policy: MatchPolicy;
    createdAt: number;
  } | null;
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

export type MatchPolicy = "perfectOnly" | "allowMixedMaybe" | "allowMutualMaybe";

export type MatchTokenSet = {
  perfect: string[];
  mixedMaybe: string[];
  mutualMaybe: string[];
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
  matchTokens: MatchTokenSet;
  policyVersion: number;
  maybeCountsAsMatch?: boolean | null;
};

export type MatchRecord = {
  questionId: string;
  createdAt: number;
  grade: "perfect" | "maybe" | "mutualMaybe";
};
