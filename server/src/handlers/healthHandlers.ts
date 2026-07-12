import type { RequestHandler } from "express";
import { json, text } from "../http/responses.js";

export const optionsHandler: RequestHandler = (_req, res) => {
  text(res, 204, "");
};

export const getHealth: RequestHandler = (_req, res) => {
  json(res, 200, { ok: true });
};
