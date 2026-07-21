import { z } from "zod";

export const routeIdSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

const MAX_CIPHERTEXT_BYTES = 64 * 1024;
const MAX_AAD_BYTES = 512;
const AES_GCM_IV_BYTES = 12;
const canonicalBase64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodeCanonicalBase64(value: string): Buffer | null {
  if (!value || value.length % 4 !== 0 || !canonicalBase64Pattern.test(value)) return null;
  const decoded = Buffer.from(value, "base64");
  return decoded.toString("base64") === value ? decoded : null;
}

function canonicalBase64Schema(name: string, maxBytes: number, exactBytes?: number) {
  return z.string().superRefine((value, ctx) => {
    const decoded = decodeCanonicalBase64(value);
    if (!decoded) {
      ctx.addIssue({ code: "custom", message: `${name} must be canonical base64` });
      return;
    }
    if (decoded.byteLength > maxBytes) {
      ctx.addIssue({ code: "too_big", maximum: maxBytes, origin: "string", inclusive: true });
    }
    if (exactBytes !== undefined && decoded.byteLength !== exactBytes) {
      ctx.addIssue({ code: "custom", message: `${name} must decode to ${exactBytes} bytes` });
    }
  });
}

export const encryptedBlobSchema = z
  .object({
    ciphertextB64: canonicalBase64Schema("ciphertextB64", MAX_CIPHERTEXT_BYTES),
    ivB64: canonicalBase64Schema("ivB64", AES_GCM_IV_BYTES, AES_GCM_IV_BYTES),
    aadB64: canonicalBase64Schema("aadB64", MAX_AAD_BYTES),
    schemaVersion: z.literal(1).optional()
  })
  .transform((blob) => ({ ...blob, schemaVersion: 1 as const }));
