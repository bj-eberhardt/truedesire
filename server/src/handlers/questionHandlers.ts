import type { RequestHandler } from "express";
import { getUserId, getValidatedBody, getValidatedParams } from "../http/request.js";
import { sendServiceResult } from "../http/serviceResponse.js";
import type { DeleteQuestionBody, PairIdParams, QuestionBody } from "../schemas/apiSchemas.js";
import {
  createQuestionForPair,
  deleteQuestionById,
  listQuestionsForPair
} from "../services/questionService.js";

export const createQuestion: RequestHandler = async (_req, res) => {
  const { pairId, blob } = getValidatedBody<QuestionBody>(res);
  const result = await createQuestionForPair(pairId, getUserId(res), blob);
  return sendServiceResult(res, result);
};

export const deleteQuestion: RequestHandler = async (_req, res) => {
  const { questionId } = getValidatedBody<DeleteQuestionBody>(res);
  const result = await deleteQuestionById(questionId, getUserId(res));
  return sendServiceResult(res, result);
};

export const listQuestions: RequestHandler = async (_req, res) => {
  const { pairId } = getValidatedParams<PairIdParams>(res);
  const result = await listQuestionsForPair(pairId, getUserId(res));
  return sendServiceResult(res, result);
};
