import type { RequestHandler } from "express";
import { getUserId, getValidatedBody } from "../../http/request.js";
import { json } from "../../http/responses.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { PairIdBody, SeedSystemQuestionsBody } from "../../schemas/apiSchemas.js";
import { listPairsForUser, removePair, seedQuestionsForPair } from "../../services/pairService.js";

export const listPairs: RequestHandler = async (_req, res) => {
  const pairs = await listPairsForUser(getUserId(res));
  return json(res, 200, { pairs });
};

export const seedSystemQuestions: RequestHandler = async (_req, res) => {
  const { pairId, items } = getValidatedBody<SeedSystemQuestionsBody>(res);
  const result = await seedQuestionsForPair(pairId, getUserId(res), items);
  return sendServiceResult(res, result);
};

export const unpair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedBody<PairIdBody>(res);
  const result = await removePair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};
