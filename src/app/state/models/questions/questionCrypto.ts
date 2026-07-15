import { decryptJson, encryptJson } from "../../../../crypto/aead";
import { derivePairAesKey } from "../../../../crypto/sharedKey";
import type { Identity } from "../../../../state/identity";
import type { AnswerChoice, EncryptedBlob, PairView } from "../../../../types";

export function isAnswerChoice(value: unknown): value is AnswerChoice {
  return value === "yes" || value === "no" || value === "maybe";
}

export async function deriveQuestionKey(identity: Identity, pair: PairView): Promise<CryptoKey> {
  if (!identity.userId) throw new Error("identity_not_available");
  return await derivePairAesKey(identity.keys.ecdhPrivateKey, pair, identity.userId);
}

export async function decryptQuestionPayload(blob: EncryptedBlob, aes: CryptoKey) {
  return await decryptJson<{
    text?: unknown;
    systemId?: unknown;
    systemVersion?: unknown;
    systemHash?: unknown;
  }>(aes, blob);
}

export async function decryptAnswerPayload(blob: EncryptedBlob, aes: CryptoKey) {
  const payload = await decryptJson<{ answer?: unknown }>(aes, blob);
  return isAnswerChoice(payload.answer) ? payload.answer : undefined;
}

export async function encryptQuestionBlob(opts: {
  aes: CryptoKey;
  pairId: string;
  text: string;
}) {
  return await encryptJson(
    opts.aes,
    { text: opts.text },
    `love-interests|pair:${opts.pairId}|question`
  );
}

export async function encryptAnswerBlob(opts: {
  aes: CryptoKey;
  pairId: string;
  questionId: string;
  answer: AnswerChoice;
}) {
  return await encryptJson(
    opts.aes,
    { answer: opts.answer },
    `love-interests|pair:${opts.pairId}|answer|q:${opts.questionId}`
  );
}
