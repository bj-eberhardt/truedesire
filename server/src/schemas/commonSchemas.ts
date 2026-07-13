import { z } from "zod";

export const routeIdSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const encryptedBlobSchema = z
  .object({
    ciphertextB64: z.string().min(1),
    ivB64: z.string().min(1),
    aadB64: z.string().min(1)
  })
  .transform((blob) => ({ ...blob, schemaVersion: 1 as const }));
