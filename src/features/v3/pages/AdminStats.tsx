import { useEffect, useMemo, useState } from "react";
import {
  type AdminStatsMetricSet,
  type AdminStatsRedactedNumber,
  type AdminStatsResponse,
  publicApiFetch
} from "../../../api/api";
import { getApiBaseUrl } from "../../../api/baseUrl";
import { V3LoadingState, V3PageError, V3View } from "../components";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: AdminStatsResponse };

const windowLabels = [7, 30, 90] as const;

function formatNumber(metric: AdminStatsRedactedNumber): string {
  if (metric.redacted || metric.value === null) return "<10";
  return new Intl.NumberFormat("de-DE").format(metric.value);
}

function formatRate(metric: AdminStatsMetricSet["matchRate"]): string {
  if (metric.redacted || metric.value === null) return "<10";
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(metric.value);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestamp)
  );
}

function metricWidth(metric: AdminStatsRedactedNumber, max: number): string {
  if (metric.redacted || metric.value === null || max <= 0) return "0%";
  return `${Math.max(6, Math.round((metric.value / max) * 100))}%`;
}

export function AdminStatsPage() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    publicApiFetch<AdminStatsResponse>(getApiBaseUrl(), "/admin/stats")
      .then((stats) => {
        if (!cancelled) setLoadState({ status: "ready", stats });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Statistik konnte nicht laden.";
        if (!cancelled) setLoadState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState.status === "loading") {
    return (
      <V3LoadingState framed title="Admin-Statistik" testId="admin-stats-loading">
        Kennzahlen werden geladen...
      </V3LoadingState>
    );
  }

  if (loadState.status === "error") {
    return (
      <V3View title="Admin-Statistik" testId="admin-stats-view">
        <V3PageError testId="admin-stats-error">{loadState.message}</V3PageError>
      </V3View>
    );
  }

  return <AdminStatsContent stats={loadState.stats} />;
}

function AdminStatsContent({ stats }: { stats: AdminStatsResponse }) {
  const trend = useMemo(() => (Array.isArray(stats.trend) ? stats.trend : []), [stats.trend]);
  const trendMax = useMemo(
    () =>
      Math.max(
        0,
        ...trend.map((day) => (day.answersGiven.redacted ? 0 : (day.answersGiven.value ?? 0)))
      ),
    [trend]
  );

  return (
    <V3View
      className="v3-admin-stats"
      title="Admin-Statistik"
      subtitle={`Aggregierte Readonly-Kennzahlen. Werte unter ${stats.privacy.minCohort} werden ausgeblendet.`}
      testId="admin-stats-view"
    >
      <div className="v3-admin-stats-meta" data-testid="admin-stats-generated-at">
        Berechnet: {formatDate(stats.computedAt ?? stats.generatedAt)}
      </div>

      <section className="v3-admin-kpi-grid" aria-label="Projektkennzahlen">
        <Kpi label="Aktive Nutzer" value={formatNumber(stats.windows[30].activeUsers)} />
        <Kpi label="Aktive Paare" value={formatNumber(stats.windows[30].activePairs)} />
        <Kpi label="Antworten" value={formatNumber(stats.windows[30].answersGiven)} />
        <Kpi label="Match-Quote" value={formatRate(stats.windows[30].matchRate)} />
      </section>

      <section className="v3-admin-stats-section">
        <h3>Zeiträume</h3>
        <div className="v3-admin-window-grid">
          {windowLabels.map((days) => (
            <WindowCard key={days} days={days} metrics={stats.windows[days]} />
          ))}
        </div>
      </section>

      <section className="v3-admin-stats-section">
        <h3>Matching gesamt</h3>
        <div className="v3-admin-match-grid">
          <Kpi
            label="Beidseitig beantwortet"
            value={formatNumber(stats.totals.mutuallyAnsweredQuestions)}
          />
          <Kpi label="Gematchte Fragen" value={formatNumber(stats.totals.matchedQuestions)} />
          <Kpi label="Perfekt" value={formatNumber(stats.totals.perfectMatches)} />
          <Kpi label="Maybe" value={formatNumber(stats.totals.maybeMatches)} />
        </div>
      </section>

      <section className="v3-admin-stats-section">
        <h3>30-Tage-Trend</h3>
        <div className="v3-admin-trend" data-testid="admin-stats-trend">
          {trend.length === 0 ? (
            <div className="hint" data-testid="admin-stats-trend-empty">
              Noch keine Trenddaten vorhanden.
            </div>
          ) : (
            trend.map((day) => (
              <div className="v3-admin-trend-day" key={day.dayStart}>
                <div className="v3-admin-trend-date">
                  {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(
                    new Date(day.dayStart)
                  )}
                </div>
                <div className="v3-admin-trend-track" aria-hidden="true">
                  <div
                    className="v3-admin-trend-bar"
                    style={{ width: metricWidth(day.answersGiven, trendMax) }}
                  />
                </div>
                <div className="v3-admin-trend-value">{formatNumber(day.answersGiven)}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </V3View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="v3-admin-kpi">
      <div className="v3-admin-kpi-label">{label}</div>
      <div className="v3-admin-kpi-value">{value}</div>
    </div>
  );
}

function WindowCard({ days, metrics }: { days: 7 | 30 | 90; metrics: AdminStatsMetricSet }) {
  return (
    <article className="v3-admin-window-card">
      <h4>{days} Tage</h4>
      <dl>
        <MetricRow label="Neue Nutzer" value={formatNumber(metrics.registeredUsers)} />
        <MetricRow label="Aktive Nutzer" value={formatNumber(metrics.activeUsers)} />
        <MetricRow label="Aktive Paare" value={formatNumber(metrics.activePairs)} />
        <MetricRow label="Fragen" value={formatNumber(metrics.questionsCreated)} />
        <MetricRow label="Antworten" value={formatNumber(metrics.answersGiven)} />
        <MetricRow label="Match-Quote" value={formatRate(metrics.matchRate)} />
      </dl>
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="v3-admin-metric-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
