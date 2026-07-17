import type { RequestHandler } from "express";
import { getUserId, getValidatedBody, getValidatedParams } from "../../http/request.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type {
  MatchPolicyBody,
  MatchPolicyRespondBody,
  PairIdParams,
  QuestionIdParams
} from "../../schemas/apiSchemas.js";
import {
  getMatchPolicyForPair,
  listAnswerStatusesForPair,
  listAnswersForPair,
  listAnswersForQuestion,
  listPrivateMatchesForPair,
  proposeMatchPolicyForPair,
  respondMatchPolicyForPair
} from "../../services/answerService.js";

export const listAnswersByQuestion: RequestHandler = async (_req, res) => {
  const { questionId } = getValidatedParams<QuestionIdParams>(res);
  const result = await listAnswersForQuestion(questionId, getUserId(res));
  return sendServiceResult(res, result);
};

export const listAnswersByPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await listAnswersForPair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const listMatchesByPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await listPrivateMatchesForPair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const listAnswerStatusesByPair: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await listAnswerStatusesForPair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const getMatchPolicy: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await getMatchPolicyForPair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};

export const proposeMatchPolicy: RequestHandler = async (_req, res) => {
  const { pairId, policy } = getValidatedBody<MatchPolicyBody>(res);
  const result = await proposeMatchPolicyForPair(pairId, getUserId(res), policy);
  return sendServiceResult(res, result);
};

export const respondMatchPolicy: RequestHandler = async (_req, res) => {
  const { pairId, proposalId, action } = getValidatedBody<MatchPolicyRespondBody>(res);
  const result = await respondMatchPolicyForPair(pairId, getUserId(res), proposalId, action);
  return sendServiceResult(res, result);
};
