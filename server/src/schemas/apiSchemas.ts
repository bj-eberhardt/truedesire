import { z } from "zod";
import { encryptedBlobSchema, routeIdSchema } from "./commonSchemas.js";

export const registerBodySchema = z.object({
  nickname: z.string().trim().min(1).max(30).default("Anon"),
  signPublicJwk: z.record(z.string(), z.unknown()),
  ecdhPublicRawB64: z.string().min(16)
});

export const pairingRequestBodySchema = z.object({
  partnerCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase())
});

export const pairingRespondBodySchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["accept", "reject", "cancel"])
});

export const pairIdBodySchema = z.object({
  pairId: z.string().min(1)
});

export const weeklyLimitProposeBodySchema = z.object({
  pairId: z.string().min(1),
  limit: z.number().int().min(0).max(50)
});

export const weeklyLimitRespondBodySchema = z.object({
  pairId: z.string().min(1),
  proposalId: z.string().min(1),
  action: z.enum(["accept", "reject", "cancel"])
});

export const seedSystemQuestionsBodySchema = z.object({
  pairId: z.string().min(1),
  items: z.array(
    z.object({
      systemId: z.string().min(1),
      systemVersion: z.number().int().min(1).optional(),
      blob: encryptedBlobSchema
    })
  )
});

export const questionBodySchema = z.object({
  pairId: z.string().min(1),
  blob: encryptedBlobSchema
});

export const deleteQuestionBodySchema = z.object({
  questionId: z.string().min(1)
});

export const answerBodySchema = z.object({
  questionId: z.string().min(1),
  blob: encryptedBlobSchema
});

export const pairIdParamsSchema = z.object({
  pairId: routeIdSchema
});

export const questionIdParamsSchema = z.object({
  questionId: routeIdSchema
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type PairingRequestBody = z.infer<typeof pairingRequestBodySchema>;
export type PairingRespondBody = z.infer<typeof pairingRespondBodySchema>;
export type PairIdBody = z.infer<typeof pairIdBodySchema>;
export type WeeklyLimitProposeBody = z.infer<typeof weeklyLimitProposeBodySchema>;
export type WeeklyLimitRespondBody = z.infer<typeof weeklyLimitRespondBodySchema>;
export type SeedSystemQuestionsBody = z.infer<typeof seedSystemQuestionsBodySchema>;
export type QuestionBody = z.infer<typeof questionBodySchema>;
export type DeleteQuestionBody = z.infer<typeof deleteQuestionBodySchema>;
export type AnswerBody = z.infer<typeof answerBodySchema>;
export type PairIdParams = z.infer<typeof pairIdParamsSchema>;
export type QuestionIdParams = z.infer<typeof questionIdParamsSchema>;
