import {
  readAdminStatsCounts,
  readAdminStatsTrendCounts,
  type AdminStatsCounts
} from "../repositories/adminStatsRepository.js";

const MIN_COHORT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOWS = [7, 30, 90] as const;

type WindowDays = (typeof WINDOWS)[number];

type RedactedNumber = { value: number | null; redacted: boolean };
type RedactedRate = {
  value: number | null;
  redacted: boolean;
  numerator: number | null;
  denominator: number | null;
};

export type AdminStatsMetricSet = {
  registeredUsers: RedactedNumber;
  activeUsers: RedactedNumber;
  activePairs: RedactedNumber;
  questionsCreated: RedactedNumber;
  answersGiven: RedactedNumber;
  activatedUsers: RedactedNumber;
  activatedPairs: RedactedNumber;
  mutuallyAnsweredQuestions: RedactedNumber;
  matchedQuestions: RedactedNumber;
  perfectMatches: RedactedNumber;
  maybeMatches: RedactedNumber;
  matchRate: RedactedRate;
};

export type AdminStatsResponse = {
  computedAt: number;
  generatedAt: number;
  privacy: { minCohort: number };
  totals: AdminStatsMetricSet;
  windows: Record<WindowDays, AdminStatsMetricSet>;
  trend: Array<{
    dayStart: number;
    registeredUsers: RedactedNumber;
    activeUsers: RedactedNumber;
    activePairs: RedactedNumber;
    questionsCreated: RedactedNumber;
    answersGiven: RedactedNumber;
  }>;
};

function visibleNumber(value: number, cohort = value): RedactedNumber {
  return cohort >= MIN_COHORT ? { value, redacted: false } : { value: null, redacted: true };
}

function visibleRate(numerator: number, denominator: number): RedactedRate {
  if (denominator < MIN_COHORT) {
    return { value: null, redacted: true, numerator: null, denominator: null };
  }
  return {
    value: denominator === 0 ? 0 : numerator / denominator,
    redacted: false,
    numerator,
    denominator
  };
}

function mapMetricSet(counts: AdminStatsCounts): AdminStatsMetricSet {
  return {
    registeredUsers: visibleNumber(counts.registeredUsers),
    activeUsers: visibleNumber(counts.activeUsers),
    activePairs: visibleNumber(counts.activePairs),
    questionsCreated: visibleNumber(counts.questionsCreated),
    answersGiven: visibleNumber(counts.answersGiven),
    activatedUsers: visibleNumber(counts.activatedUsers),
    activatedPairs: visibleNumber(counts.activatedPairs),
    mutuallyAnsweredQuestions: visibleNumber(counts.mutuallyAnsweredQuestions),
    matchedQuestions: visibleNumber(counts.matchedQuestions, counts.mutuallyAnsweredQuestions),
    perfectMatches: visibleNumber(counts.perfectMatches, counts.mutuallyAnsweredQuestions),
    maybeMatches: visibleNumber(counts.maybeMatches, counts.mutuallyAnsweredQuestions),
    matchRate: visibleRate(counts.matchedQuestions, counts.mutuallyAnsweredQuestions)
  };
}

function dayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function readTrend(now: number): Promise<AdminStatsResponse["trend"]> {
  const endAt = dayStart(now) + DAY_MS;
  const startAt = endAt - 30 * DAY_MS;
  const trend = await readAdminStatsTrendCounts(startAt, endAt);

  return trend.map((row) => {
    return {
      dayStart: row.dayStart,
      registeredUsers: visibleNumber(row.registeredUsers),
      activeUsers: visibleNumber(row.activeUsers),
      activePairs: visibleNumber(row.activePairs, row.activeUsers),
      questionsCreated: visibleNumber(row.questionsCreated, row.activeUsers),
      answersGiven: visibleNumber(row.answersGiven, row.activeUsers)
    };
  });
}

export async function readAdminStats(now = Date.now()): Promise<AdminStatsResponse> {
  const totals = mapMetricSet(await readAdminStatsCounts(null, now + 1));
  const windows = Object.fromEntries(
    await Promise.all(
      WINDOWS.map(async (days) => [
        days,
        mapMetricSet(await readAdminStatsCounts(now - days * DAY_MS, now + 1))
      ])
    )
  ) as Record<WindowDays, AdminStatsMetricSet>;

  return {
    computedAt: now,
    generatedAt: now,
    privacy: { minCohort: MIN_COHORT },
    totals,
    windows,
    trend: await readTrend(now)
  };
}
