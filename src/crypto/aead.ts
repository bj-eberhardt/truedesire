import { base64ToBytes, bytesToArrayBuffer, bytesToBase64, utf8ToBytes } from "./base64";
import type { EncryptedBlob } from "../types";

const SCHEMA_VERSION = 1;

export async function encryptJson(
  key: CryptoKey,
  data: unknown,
  aadText?: string
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = utf8ToBytes(aadText ?? "love-interests|e2e|v1");
  const plaintext = utf8ToBytes(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bytesToArrayBuffer(iv), additionalData: bytesToArrayBuffer(aad) },
    key,
    bytesToArrayBuffer(plaintext)
  );
  return {
    ciphertextB64: bytesToBase64(new Uint8Array(ciphertext)),
    ivB64: bytesToBase64(iv),
    aadB64: bytesToBase64(aad),
    schemaVersion: SCHEMA_VERSION
  };
}

export async function decryptJson<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const iv = base64ToBytes(blob.ivB64);
  const aad = base64ToBytes(blob.aadB64);
  const ciphertext = base64ToBytes(blob.ciphertextB64);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesToArrayBuffer(iv), additionalData: bytesToArrayBuffer(aad) },
    key,
    bytesToArrayBuffer(ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(new Uint8Array(plaintext))) as T;
}
