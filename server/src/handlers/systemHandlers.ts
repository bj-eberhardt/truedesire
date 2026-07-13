import type { RequestHandler } from "express";
import { bad, json } from "../http/responses.js";
import { readSystemQuestions } from "../services/systemQuestions.js";

export const getSystemQuestions: RequestHandler = async (_req, res) => {
  const result = readSystemQuestions();
  if (!result.ok) return bad(res, result.error, 500);
  return json(res, 200, {
    catalogVersion: result.catalogVersion,
    questions: result.questions,
    verificationCatalog: result.verificationCatalog
  });
};
