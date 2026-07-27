const defaultTestDatabaseUrl =
  "postgres://truedesire:truedesire@localhost:55432/truedesire_server_test";

process.env.DATABASE_URL ||= defaultTestDatabaseUrl;
process.env.NODE_ENV ||= "test";

const databaseUrl = new URL(process.env.DATABASE_URL);
const isAllowedTestDatabase =
  databaseUrl.pathname === "/truedesire_server_test" && databaseUrl.port === "55432";

if (!isAllowedTestDatabase) {
  throw new Error(
    [
      "Refusing to run backend tests against a non-test database.",
      `DATABASE_URL points to ${databaseUrl.host}${databaseUrl.pathname}.`,
      "Use postgres://truedesire:truedesire@localhost:55432/truedesire_server_test."
    ].join(" ")
  );
}

await import("../node_modules/vitest/vitest.mjs");
