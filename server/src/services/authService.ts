import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  createUser,
  getUserById,
  listUserCodes,
  markUserDeleted
} from "../repositories/userRepository.js";
import type { RegisterBody } from "../schemas/apiSchemas.js";
import { makeUserCode } from "./userService.js";
import { fail, ok, type ServiceResult } from "./serviceResult.js";

export async function registerAccount(
  body: RegisterBody
): Promise<{ userId: string; code: string }> {
  const userId = newId();
  const code = makeUserCode(new Set(await listUserCodes()));

  await createUser({
    id: userId,
    code,
    nickname: body.nickname,
    signPublicJwk: body.signPublicJwk,
    ecdhPublicRawB64: body.ecdhPublicRawB64
  });

  return { userId, code };
}

export async function getAccount(userId: string): Promise<
  ServiceResult<{
    id: string;
    code: string;
    nickname: string;
    ecdhPublicRawB64: string;
  }>
> {
  const user = await getUserById(userId);
  if (!user) return fail(ApiErrorCode.NotFound, 404);
  return ok({
    id: user.id,
    code: user.code,
    nickname: user.nickname,
    ecdhPublicRawB64: user.ecdhPublicRawB64
  });
}

export async function deleteAccountById(userId: string): Promise<ServiceResult<{ ok: true }>> {
  const deleted = await markUserDeleted(userId, "Gelöscht");
  if (!deleted) return fail(ApiErrorCode.NotFound, 404);
  return ok({ ok: true });
}
