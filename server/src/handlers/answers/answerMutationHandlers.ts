import type { RequestHandler } from "express";
import { getUserId, getValidatedBody } from "../../http/request.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { AnswerBody } from "../../schemas/apiSchemas.js";
import { createAnswerForQuestion, upsertAnswerForQuestion } from "../../services/answerService.js";

export const createAnswer: RequestHandler = async (_req, res) => {
  const { questionId, blob } = getValidatedBody<AnswerBody>(res);
  const result = await createAnswerForQuestion(questionId, getUserId(res), blob);
  return sendServiceResult(res, result);
};

export const upsertAnswer: RequestHandler = async (_req, res) => {
  const { questionId, blob } = getValidatedBody<AnswerBody>(res);
  const result = await upsertAnswerForQuestion(questionId, getUserId(res), blob);
  return sendServiceResult(res, result);
};
