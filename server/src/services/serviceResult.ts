import type { ApiErrorCode } from "../errors/apiErrorCode.js";

export type ServiceError = {
  code: ApiErrorCode;
  status: number;
};

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

export function fail<T = never>(code: ApiErrorCode, status: number): ServiceResult<T> {
  return { ok: false, error: { code, status } };
}
