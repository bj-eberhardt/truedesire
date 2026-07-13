import type { RequestHandler } from "express";
import { getUserId, getValidatedParams } from "../../http/request.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { PairIdParams, QuestionIdParams } from "../../schemas/apiSchemas.js";
import { listAnswersForPair, listAnswersForQuestion } from "../../services/answerService.js";

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
