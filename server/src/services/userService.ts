import { webcrypto as crypto } from "node:crypto";
import { newId } from "../crypto/auth.js";

export function makeUserCode(existing: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 1000; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    let code = "";
    for (const byte of bytes) code += alphabet[byte % alphabet.length];
    if (!existing.has(code)) return code;
  }
  return newId().slice(0, 8).toUpperCase();
}
