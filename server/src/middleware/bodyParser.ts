import type { RequestHandler } from "express";

async function readBody(
  req: Parameters<RequestHandler>[0]
): Promise<{ raw: Buffer; json: unknown }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks);
  const contentType = String(req.headers["content-type"] ?? "");
  if (!raw.length || !contentType.includes("application/json")) return { raw, json: null };

  try {
    return { raw, json: JSON.parse(raw.toString("utf8")) };
  } catch {
    return { raw, json: null };
  }
}

export const parseBody: RequestHandler = async (req, res, next) => {
  try {
    const parsed = await readBody(req);
    res.locals.rawBody = parsed.raw;
    res.locals.parsedBody = parsed.json;
    next();
  } catch (err) {
    next(err);
  }
};
