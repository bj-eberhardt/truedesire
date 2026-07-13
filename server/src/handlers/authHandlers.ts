import type { RequestHandler } from "express";
import { getUserId, getValidatedBody } from "../http/request.js";
import { json } from "../http/responses.js";
import { sendServiceResult } from "../http/serviceResponse.js";
import { log } from "../logger.js";
import type { RegisterBody } from "../schemas/apiSchemas.js";
import { deleteAccountById, getAccount, registerAccount } from "../services/authService.js";

export const registerUser: RequestHandler = async (_req, res) => {
  const account = await registerAccount(getValidatedBody<RegisterBody>(res));
  log("info", "user registered", account);
  return json(res, 200, { userId: account.userId });
};

export const getMe: RequestHandler = async (_req, res) => {
  const result = await getAccount(getUserId(res));
  return sendServiceResult(res, result);
};

export const deleteAccount: RequestHandler = async (_req, res) => {
  const userId = getUserId(res);
  const result = await deleteAccountById(userId);
  if (result.ok) log("info", "user deleted", { userId });
  return sendServiceResult(res, result);
};
