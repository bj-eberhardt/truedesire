import type { PairView } from "../../../../types";

export type WeeklyLimitValidation =
  { ok: true; limit: number } | { ok: false; reason: "not_a_number" | "out_of_range" };

export function getEffectiveWeeklyLimit(pair: PairView): number {
  return pair.usage?.weeklyLimit ?? pair.weeklyLimit;
}

export function isAnswerLimitReached(pair: PairView): boolean {
  const weeklyLimit = getEffectiveWeeklyLimit(pair);
  const answeredThisWeek = pair.usage?.answeredThisWeek ?? 0;
  return weeklyLimit > 0 && answeredThisWeek >= weeklyLimit;
}

export function weeklyLimitDraftFromPair(pair: PairView): string {
  return String(pair.weeklyLimit);
}

export function allowsAllQuestions(pair: PairView): boolean {
  return getEffectiveWeeklyLimit(pair) === 0;
}

export function validateWeeklyLimitDraft(opts: {
  allowAllQuestions: boolean;
  weeklyLimitDraft: string;
}): WeeklyLimitValidation {
  if (opts.allowAllQuestions) return { ok: true, limit: 0 };
  const limit = Number(opts.weeklyLimitDraft);
  if (!Number.isFinite(limit)) return { ok: false, reason: "not_a_number" };
  if (limit < 0 || limit > 50) return { ok: false, reason: "out_of_range" };
  return { ok: true, limit };
}
