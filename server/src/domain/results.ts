export type AccessFailure = "missing" | "forbidden" | "partner_deleted";
export type ActivePairFailure = AccessFailure | "pair_not_active";
export type QuestionDeleteResult = "deleted" | "missing" | "forbidden" | "partner_answered";
export type PairRemoveResult = "removed" | "missing" | "forbidden";
export type PairJoinResult = "joined" | "missing" | "own" | "full";
export type WeeklyLimitResult =
  "missing" | "forbidden" | "partner_deleted" | "no_pending" | "own_response";
