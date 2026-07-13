import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    reporters: ["default", "json"],
    outputFile: {
      json: "../test-results/server-tests.json"
    }
  }
});
