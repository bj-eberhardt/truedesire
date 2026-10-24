import express from "express";
import { expect, test } from "vitest";
import { createStaticFallbackRateLimit } from "../src/middleware/staticFallbackRateLimit.js";

test("static frontend requests are rate limited by client IP", async () => {
  const app = express();
  app.use(createStaticFallbackRateLimit(2, 2));
  app.get("/", (_req, res) => res.send("ok"));

  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not bind");
    const url = `http://127.0.0.1:${address.port}/`;
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(429);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
