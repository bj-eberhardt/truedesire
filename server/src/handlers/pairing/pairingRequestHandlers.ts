import type { RequestHandler } from "express";
import { getUserId, getValidatedBody } from "../../http/request.js";
import { sendServiceResult } from "../../http/serviceResponse.js";
import type { PairingRequestBody, PairingRespondBody } from "../../schemas/apiSchemas.js";
import {
  listPendingPairingRequests,
  requestPairingWithCode,
  respondToPairingRequest
} from "../../services/pairingService.js";

export const requestPairing: RequestHandler = async (req, res) => {
  const { partnerCode } = getValidatedBody<PairingRequestBody>(res);
  const result = await requestPairingWithCode(req, getUserId(res), partnerCode);
  return sendServiceResult(res, result);
};

export const respondToPairing: RequestHandler = async (_req, res) => {
  const { requestId, action } = getValidatedBody<PairingRespondBody>(res);
  const result = await respondToPairingRequest(getUserId(res), requestId, action);
  return sendServiceResult(res, result);
};

export const listPairingRequests: RequestHandler = async (_req, res) => {
  const result = await listPendingPairingRequests(getUserId(res));
  return sendServiceResult(res, result);
};
