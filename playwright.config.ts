import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:3101";
const shouldStartLocalServer = !process.env.BASE_URL && process.env.PLAYWRIGHT_START_SERVER === "1";
const insecureOriginArgs =
  baseURL.startsWith("http://localhost") || baseURL.startsWith("http://127.0.0.1")
    ? []
    : [`--unsafely-treat-insecure-origin-as-secure=${baseURL}`];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
    workers: 2,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-results.json" }],
    ["html", { open: "never" }]
  ],
  webServer: shouldStartLocalServer
    ? {
        command: "npm run dev -- --host 127.0.0.1 --port 3101",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
    : undefined,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: insecureOriginArgs
    }
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
