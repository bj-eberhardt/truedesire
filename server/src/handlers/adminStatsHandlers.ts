import type { RequestHandler } from "express";
import { json } from "../http/responses.js";
import { readAdminStats } from "../services/adminStatsService.js";
import { TtlCache } from "../utils/ttlCache.js";

const ADMIN_STATS_CACHE_TTL_MS = 30 * 60 * 1000;
const adminStatsCache = new TtlCache<Awaited<ReturnType<typeof readAdminStats>>>(
  ADMIN_STATS_CACHE_TTL_MS
);

export const getAdminStats: RequestHandler = async (_req, res, next) => {
  try {
    // Intentionally public: the response contains only aggregate values guarded by a min cohort.
    const entry = await adminStatsCache.getOrCreate(() => readAdminStats());
    res.set({
      "x-admin-stats-computed-at": String(entry.value.computedAt),
      "x-admin-stats-cache-expires-at": String(entry.expiresAt)
    });
    json(res, 200, entry.value);
  } catch (err) {
    next(err);
  }
};

export function clearAdminStatsCache() {
  adminStatsCache.clear();
}
