import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { AdminStatsMetricSet, AdminStatsResponse } from "../../../api/api";
import { publicApiFetch } from "../../../api/api";
import { AdminStatsPage } from "./AdminStats";

vi.mock("../../../api/baseUrl", () => ({
  getApiBaseUrl: () => "https://example.test"
}));

vi.mock("../../../api/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/api")>();
  return {
    ...actual,
    publicApiFetch: vi.fn()
  };
});

function visible(value: number) {
  return { value, redacted: false };
}

function redacted() {
  return { value: null, redacted: true };
}

function metricSet(overrides: Partial<AdminStatsMetricSet> = {}): AdminStatsMetricSet {
  return {
    registeredUsers: visible(20),
    activeUsers: visible(12),
    activePairs: visible(10),
    questionsCreated: visible(14),
    answersGiven: visible(24),
    activatedUsers: visible(18),
    activatedPairs: visible(10),
    mutuallyAnsweredQuestions: visible(10),
    matchedQuestions: visible(8),
    perfectMatches: visible(6),
    maybeMatches: visible(2),
    matchRate: { value: 0.8, redacted: false, numerator: 8, denominator: 10 },
    ...overrides
  };
}

function stats(overrides: Partial<AdminStatsResponse> = {}): AdminStatsResponse {
  const baseMetrics = metricSet();
  return {
    computedAt: Date.UTC(2026, 6, 27, 12),
    generatedAt: Date.UTC(2026, 6, 27, 12),
    privacy: { minCohort: 10 },
    totals: baseMetrics,
    windows: { 7: baseMetrics, 30: baseMetrics, 90: baseMetrics },
    trend: [
      {
        dayStart: Date.UTC(2026, 6, 26),
        registeredUsers: visible(10),
        activeUsers: visible(10),
        activePairs: visible(10),
        questionsCreated: visible(10),
        answersGiven: visible(10)
      }
    ],
    ...overrides
  };
}

beforeEach(() => {
  const originalConsoleError = console.error;
  vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("react-test-renderer is deprecated")) {
      return;
    }
    originalConsoleError(message, ...args);
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders loading and then public aggregate stats", async () => {
  vi.mocked(publicApiFetch).mockResolvedValue(stats());
  const renderer = render(React.createElement(AdminStatsPage));

  expect(renderer.root.findByProps({ "data-testid": "admin-stats-loading" })).toBeTruthy();

  await act(async () => {
    await Promise.resolve();
  });

  expect(publicApiFetch).toHaveBeenCalledWith("https://example.test", "/admin/stats");
  expect(renderer.root.findByProps({ "data-testid": "admin-stats-view" })).toBeTruthy();
  expect(renderer.root.findAllByProps({ className: "v3-admin-kpi-value" })[0].children).toEqual([
    "12"
  ]);
});

test("renders redacted and error states", async () => {
  vi.mocked(publicApiFetch).mockResolvedValue(
    stats({
      windows: {
        7: metricSet({
          activeUsers: redacted(),
          matchRate: { value: null, redacted: true, numerator: null, denominator: null }
        }),
        30: metricSet({
          activeUsers: redacted(),
          matchRate: { value: null, redacted: true, numerator: null, denominator: null }
        }),
        90: metricSet({
          activeUsers: redacted(),
          matchRate: { value: null, redacted: true, numerator: null, denominator: null }
        })
      }
    })
  );
  const redactedRenderer = render(React.createElement(AdminStatsPage));
  await act(async () => {
    await Promise.resolve();
  });
  expect(
    redactedRenderer.root.findAllByProps({ className: "v3-admin-kpi-value" })[0].children
  ).toEqual(["<10"]);

  vi.mocked(publicApiFetch).mockRejectedValue(new Error("network_error"));
  const errorRenderer = render(React.createElement(AdminStatsPage));
  await act(async () => {
    await Promise.resolve();
  });
  expect(errorRenderer.root.findByProps({ "data-testid": "admin-stats-error" })).toBeTruthy();
});

test("renders an empty trend state when the backend response has no trend", async () => {
  const responseWithoutTrend = stats() as Partial<AdminStatsResponse>;
  delete responseWithoutTrend.trend;
  vi.mocked(publicApiFetch).mockResolvedValue(responseWithoutTrend as AdminStatsResponse);

  const renderer = render(React.createElement(AdminStatsPage));
  await act(async () => {
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ "data-testid": "admin-stats-trend-empty" })).toBeTruthy();
});

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });

  if (!renderer) throw new Error("Component did not render");
  return renderer;
}
