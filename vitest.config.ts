import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    reporters: ["default", "json"],
    outputFile: {
      json: "ci-reports/frontend/unit-tests.json"
    }
  }
});
