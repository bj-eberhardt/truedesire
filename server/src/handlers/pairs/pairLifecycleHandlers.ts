import type { RequestHandler } from "express";
import { getUserId, getValidatedBody, getValidatedParams } from "../../http/request.js";
import { json } from "../../http/responses.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { PairIdBody, PairIdParams } from "../../schemas/apiSchemas.js";
import {
  confirmPairById,
  createPairForUser,
  getPairDetails,
  joinPairById
} from "../../services/pairService.js";

export const createPair: RequestHandler = async (_req, res) => {
  const result = await createPairForUser(getUserId(res));
  return json(res, 200, result);
};

export const joinPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedBody<PairIdBody>(res);
  const result = await joinPairById(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const confirmPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedBody<PairIdBody>(res);
  const result = await confirmPairById(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const getPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await getPairDetails(pairId, getUserId(res));
  return sendServiceResult(res, result);
};
