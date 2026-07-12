import type { RequestHandler } from "express";
import { getUserId, getValidatedBody } from "../../http/request.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { WeeklyLimitProposeBody, WeeklyLimitRespondBody } from "../../schemas/apiSchemas.js";
import {
  proposeWeeklyLimitForPair,
  respondWeeklyLimitForPair
} from "../../services/pairService.js";

export const proposeWeeklyLimit: RequestHandler = async (_req, res) => {
  const { pairId, limit } = getValidatedBody<WeeklyLimitProposeBody>(res);
  const result = await proposeWeeklyLimitForPair(pairId, getUserId(res), limit);
  return sendServiceResult(res, result);
};

export const respondWeeklyLimit: RequestHandler = async (_req, res) => {
  const { pairId, proposalId, action } = getValidatedBody<WeeklyLimitRespondBody>(res);
  const result = await respondWeeklyLimitForPair(pairId, getUserId(res), proposalId, action);
  return sendServiceResult(res, result);
};
