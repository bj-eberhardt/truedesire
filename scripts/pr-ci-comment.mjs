import { readFile } from "node:fs/promises";

const marker = "<!-- pr-ci-comment -->";
const playwrightResultsPath =
  process.env.PLAYWRIGHT_RESULTS_PATH || "test-results/playwright-results.json";
const backendTestResultsPath =
  process.env.BACKEND_TEST_RESULTS_PATH || "test-results/server-tests.json";

function iconFor(outcome) {
  if (outcome === "success" || outcome === "passed") return "\u2705";
  if (outcome === "failure" || outcome === "failed" || outcome === "timedOut") return "\u274c";
  if (outcome === "skipped" || outcome === "not configured") return "\u26aa";
  if (outcome === "cancelled" || outcome === "interrupted") return "\u26a0\ufe0f";
  return "\u2754";
}

function labelFor(outcome) {
  if (outcome === "success") return `${iconFor(outcome)} success`;
  if (outcome === "failure") return `${iconFor(outcome)} failure`;
  if (outcome === "skipped") return `${iconFor(outcome)} skipped`;
  if (outcome === "cancelled") return `${iconFor(outcome)} cancelled`;
  return `${iconFor(outcome)} ${outcome || "unknown"}`;
}

function details(summary, body) {
  return `<details>
<summary>${summary}</summary>

${body.trim() || "_No content._"}

</details>`;
}
function testTitle(parts, spec, test) {
  return [...parts, spec.title, test.projectName].filter(Boolean).join(" > ");
}

function finalRunnableResult(test) {
  const runnableResults = (test.results ?? []).filter((result) => result.status !== "skipped");
  return runnableResults.at(-1) ?? (test.results ?? []).at(-1) ?? null;
}

function firstErrorMessage(result) {
  const error = result?.error ?? result?.errors?.[0];
  if (!error) return "";
  return error.message || error.stack || String(error);
}

function walkSuites(suites, stats, parts = []) {
  for (const suite of suites ?? []) {
    const nextParts = suite.title ? [...parts, suite.title] : parts;
    walkSuites(suite.suites, stats, nextParts);

    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const finalResult = finalRunnableResult(test);
        const status = finalResult?.status ?? "skipped";

        if (status === "skipped") {
          stats.skipped += 1;
          continue;
        }

        stats.total += 1;
        if (status === "passed") {
          stats.passed += 1;
          continue;
        }

        stats.failed += 1;
        stats.failures.push({
          title: testTitle(nextParts, spec, test),
          status,
          retryCount: Math.max((test.results?.length ?? 1) - 1, 0),
          duration: finalResult?.duration ?? 0,
          error: firstErrorMessage(finalResult)
        });
      }
    }
  }
}


function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return `, ${Math.round(ms / 1000)}s`;
}

function formatFailures(failures, label = "test") {
  if (failures.length === 0) return `No failed ${label} cases.`;

  return failures
    .map((failure) => {
      const retryText = failure.retryCount > 0 ? `, retries: ${failure.retryCount}` : "";
      const header = `- ${iconFor(failure.status)} ${failure.title} (${failure.status}${retryText}${formatDuration(failure.duration)})`;
      if (!failure.error) return header;
      return `${header}\n\n`;
    })
    .join("\n\n");
}

async function readPlaywrightStats() {
  try {
    const raw = await readFile(playwrightResultsPath, "utf8");
    const report = JSON.parse(raw);
    const stats = { passed: 0, failed: 0, skipped: 0, total: 0, failures: [] };
    walkSuites(report.suites, stats);
    return stats;
  } catch {
    return { passed: 0, failed: 0, skipped: 0, total: 0, failures: [] };
  }
}

function readVitestStats(report) {
  const failures = [];

  for (const fileResult of report.testResults ?? []) {
    for (const testResult of fileResult.assertionResults ?? []) {
      if (testResult.status !== "failed") continue;

      failures.push({
        title: testResult.fullName || testResult.title || fileResult.name || "unknown backend test",
        status: "failed",
        retryCount: 0,
        duration: testResult.duration ?? 0,
        error: (testResult.failureMessages ?? []).join("\n\n")
      });
    }
  }

  const passed = Number(report.numPassedTests ?? 0);
  const failed = Number(report.numFailedTests ?? failures.length);
  const skipped = Number(report.numPendingTests ?? 0) + Number(report.numTodoTests ?? 0);

  return {
    passed,
    failed,
    skipped,
    total: Number(report.numTotalTests ?? passed + failed + skipped),
    failures
  };
}

async function readBackendTestStats() {
  try {
    const raw = await readFile(backendTestResultsPath, "utf8");
    return readVitestStats(JSON.parse(raw));
  } catch {
    return { passed: 0, failed: 0, skipped: 0, total: 0, failures: [] };
  }
}

const frontendBuild = labelFor(process.env.FRONTEND_BUILD_OUTCOME);
const backendBuild = labelFor(process.env.BACKEND_BUILD_OUTCOME);
const lint = labelFor(process.env.LINT_OUTCOME);
const backendLint = labelFor(process.env.LINT_SERVER_OUTCOME);
const backendTests = labelFor(process.env.BACKEND_TESTS_OUTCOME);
const prettier = labelFor(process.env.PRETTIER_OUTCOME);
const e2e = labelFor(process.env.E2E_OUTCOME);
const reportUrl = process.env.PLAYWRIGHT_REPORT_URL || process.env.RUN_URL || "";
const backendTestResultsUrl = process.env.BACKEND_TEST_RESULTS_URL || "";
const playwright = await readPlaywrightStats();
const backendNodeTests = await readBackendTestStats();
const playwrightIcon = playwright.failed > 0 ? iconFor("failed") : iconFor("passed");
const backendTestsIcon = backendNodeTests.failed > 0 ? iconFor("failed") : iconFor("passed");

const summary = [
  marker,
  "## PR CI",
  "",
  `Playwright tests: ${playwrightIcon} **${playwright.passed}/${playwright.total} successful**`,
  `Backend tests: ${backendTestsIcon} **${backendNodeTests.passed}/${backendNodeTests.total} successful**`,
  "",
  "| Check | Status | Hint",
  "| --- | --- | --- |",
  `| Frontend build | ${frontendBuild} | |`,
  `| Backend build | ${backendBuild} | |`,
  `| Lint | ${lint} | npm run lint:fix |`,
  `| Backend Lint | ${backendLint} | npm run --prefix server lint:fix |`,
  `| Formatting | ${prettier} | npm run format |`,
  `| Backend tests | ${backendTests} | npm run server:test:docker |`,
  `| E2E tests | ${e2e} | |`,
  "",
  `Backend test artifact: ${backendTestResultsUrl ? `[backend-test-results](${backendTestResultsUrl})` : "_not available_"}`,
  `Playwright report artifact: ${reportUrl ? `[playwright-report](${reportUrl})` : "_not available_"}`,
  "",
  details(
    `Backend test failures (${backendNodeTests.failed})`,
    formatFailures(backendNodeTests.failures, "backend test")
  ),
  "",
  details(`Playwright failures (${playwright.failed})`, formatFailures(playwright.failures, "Playwright test")),
  "",
  details(
    "Artifacts",
    [
      reportUrl ? `- [playwright-report](${reportUrl})` : "- playwright-report: not available",
      backendTestResultsUrl
        ? `- [backend-test-results](${backendTestResultsUrl})`
        : "- backend-test-results: not available",
      process.env.RUN_URL ? `- [workflow run](${process.env.RUN_URL})` : ""
    ]
      .filter(Boolean)
      .join("\n")
  ),
  ""
].join("\n");

console.log(summary);
