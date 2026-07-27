import { DATABASE_URL } from "../src/config.js";

export function assertSafeTestDatabase() {
  const url = new URL(DATABASE_URL);
  const isTestDatabase = url.pathname === "/truedesire_server_test" || url.port === "55432";
  if (!isTestDatabase) {
    throw new Error(
      `Refusing to run destructive test database reset against non-test database: ${url.host}${url.pathname}`
    );
  }
}
