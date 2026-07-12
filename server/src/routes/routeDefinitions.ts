import type { RequestHandler } from "express";
import {
  createAnswer,
  listAnswersByPair,
  listAnswersByQuestion,
  upsertAnswer
} from "../handlers/answerHandlers.js";
import { deleteAccount, getMe, registerUser } from "../handlers/authHandlers.js";
import { getHealth, optionsHandler } from "../handlers/healthHandlers.js";
import {
  requestPairing,
  respondToPairing,
  listPairingRequests
} from "../handlers/pairingHandlers.js";
import {
  confirmPair,
  createPair,
  getPair,
  joinPair,
  listPairs,
  proposeWeeklyLimit,
  respondWeeklyLimit,
  seedSystemQuestions,
  unpair
} from "../handlers/pairHandlers.js";
import { createQuestion, deleteQuestion, listQuestions } from "../handlers/questionHandlers.js";
import { getSystemQuestions } from "../handlers/systemHandlers.js";
import type { RouteSchemas } from "../middleware/validateRequest.js";
import {
  answerBodySchema,
  deleteQuestionBodySchema,
  pairIdBodySchema,
  pairIdParamsSchema,
  pairingRequestBodySchema,
  pairingRespondBodySchema,
  questionBodySchema,
  questionIdParamsSchema,
  registerBodySchema,
  seedSystemQuestionsBodySchema,
  weeklyLimitProposeBodySchema,
  weeklyLimitRespondBodySchema
} from "../schemas/apiSchemas.js";

export type HttpMethod = "get" | "post" | "options";

export type RouteDefinition = {
  method: HttpMethod;
  path: string | RegExp;
  auth: "public" | "required";
  schemas?: RouteSchemas;
  handler: RequestHandler;
};

export const routes: RouteDefinition[] = [
  { method: "options", path: /.*/, auth: "public", handler: optionsHandler },
  { method: "get", path: "/health", auth: "public", handler: getHealth },

  {
    method: "post",
    path: "/api/auth/register",
    auth: "public",
    schemas: { body: registerBodySchema },
    handler: registerUser
  },
  { method: "get", path: "/api/auth/me", auth: "required", handler: getMe },
  { method: "post", path: "/api/auth/delete", auth: "required", handler: deleteAccount },

  {
    method: "post",
    path: "/api/pairing/request",
    auth: "required",
    schemas: { body: pairingRequestBodySchema },
    handler: requestPairing
  },
  {
    method: "post",
    path: "/api/pairing/respond",
    auth: "required",
    schemas: { body: pairingRespondBodySchema },
    handler: respondToPairing
  },
  {
    method: "get",
    path: "/api/pairing/requests",
    auth: "required",
    handler: listPairingRequests
  },

  { method: "get", path: "/api/pairs", auth: "required", handler: listPairs },
  {
    method: "post",
    path: "/api/pairs/seed-system-questions",
    auth: "required",
    schemas: { body: seedSystemQuestionsBodySchema },
    handler: seedSystemQuestions
  },
  {
    method: "post",
    path: "/api/pairs/unpair",
    auth: "required",
    schemas: { body: pairIdBodySchema },
    handler: unpair
  },

  { method: "post", path: "/api/pair/create", auth: "required", handler: createPair },
  {
    method: "post",
    path: "/api/pair/join",
    auth: "required",
    schemas: { body: pairIdBodySchema },
    handler: joinPair
  },
  {
    method: "post",
    path: "/api/pair/confirm",
    auth: "required",
    schemas: { body: pairIdBodySchema },
    handler: confirmPair
  },
  {
    method: "get",
    path: "/api/pair/:pairId",
    auth: "required",
    schemas: { params: pairIdParamsSchema },
    handler: getPair
  },

  {
    method: "post",
    path: "/api/pair/weekly-limit/propose",
    auth: "required",
    schemas: { body: weeklyLimitProposeBodySchema },
    handler: proposeWeeklyLimit
  },
  {
    method: "post",
    path: "/api/pair/weekly-limit/respond",
    auth: "required",
    schemas: { body: weeklyLimitRespondBodySchema },
    handler: respondWeeklyLimit
  },

  { method: "get", path: "/api/system/questions", auth: "required", handler: getSystemQuestions },

  {
    method: "post",
    path: "/api/questions",
    auth: "required",
    schemas: { body: questionBodySchema },
    handler: createQuestion
  },
  {
    method: "post",
    path: "/api/questions/delete",
    auth: "required",
    schemas: { body: deleteQuestionBodySchema },
    handler: deleteQuestion
  },
  {
    method: "get",
    path: "/api/questions/:pairId",
    auth: "required",
    schemas: { params: pairIdParamsSchema },
    handler: listQuestions
  },

  {
    method: "post",
    path: "/api/answers",
    auth: "required",
    schemas: { body: answerBodySchema },
    handler: createAnswer
  },
  {
    method: "post",
    path: "/api/answers/upsert",
    auth: "required",
    schemas: { body: answerBodySchema },
    handler: upsertAnswer
  },
  {
    method: "get",
    path: "/api/answers/:questionId",
    auth: "required",
    schemas: { params: questionIdParamsSchema },
    handler: listAnswersByQuestion
  },
  {
    method: "get",
    path: "/api/answers/by-pair/:pairId",
    auth: "required",
    schemas: { params: pairIdParamsSchema },
    handler: listAnswersByPair
  }
];
