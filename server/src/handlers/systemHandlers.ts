import type { RequestHandler } from "express";
import { getUserId, getValidatedParams } from "../http/request.js";
import { bad, json } from "../http/responses.js";
import type { PairIdParams } from "../schemas/apiSchemas.js";
import { readSystemQuestions, readWeeklySystemQuestions } from "../services/systemQuestions.js";

export const getSystemQuestions: RequestHandler = async (_req, res) => {
  const result = await readSystemQuestions();
  if (!result.ok) return bad(res, result.error, 500);
  return json(res, 200, {
    catalogVersion: result.catalogVersion,
    questions: result.questions,
    verificationCatalog: result.verificationCatalog
  });
};

export const getWeeklySystemQuestions: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await readWeeklySystemQuestions(pairId, getUserId(res));
  if (!result.ok) return bad(res, result.error, result.status);
  return json(res, 200, {
    weekStart: result.weekStart,
    catalogVersion: result.catalogVersion,
    questions: result.questions,
    ownQuestionIds: result.ownQuestionIds,
    verificationCatalog: result.verificationCatalog
  });
};
