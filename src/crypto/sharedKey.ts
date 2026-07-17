import { bytesToArrayBuffer, utf8ToBytes } from "./base64";
import { importEcdhPublicKey } from "./keys";
import type { PairView } from "../types";

async function deriveEcdhSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  return new Uint8Array(bits);
}

async function hkdfAesKey(
  secret: Uint8Array,
  saltText: string,
  infoText: string
): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey("raw", bytesToArrayBuffer(secret), "HKDF", false, [
    "deriveKey"
  ]);
  const salt = utf8ToBytes(saltText);
  const info = utf8ToBytes(infoText);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bytesToArrayBuffer(salt),
      info: bytesToArrayBuffer(info)
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function hkdfHmacKey(
  secret: Uint8Array,
  saltText: string,
  infoText: string
): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey("raw", bytesToArrayBuffer(secret), "HKDF", false, [
    "deriveKey"
  ]);
  const salt = utf8ToBytes(saltText);
  const info = utf8ToBytes(infoText);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: bytesToArrayBuffer(salt),
      info: bytesToArrayBuffer(info)
    },
    hkdfKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign"]
  );
}

async function derivePairSecret(
  ecdhPrivateKey: CryptoKey,
  pair: PairView,
  myUserId: string
): Promise<{ secret: Uint8Array; a: string; b: string }> {
  const partner = pair.partner;
  if (!partner) throw new Error("pair_not_complete");
  const partnerPub = await importEcdhPublicKey(partner.ecdhPublicRawB64);
  const secret = await deriveEcdhSecret(ecdhPrivateKey, partnerPub);
  const [a, b] = [myUserId, partner.id].sort();
  return { secret, a, b };
}

export async function derivePairAesKey(
  ecdhPrivateKey: CryptoKey,
  pair: PairView,
  myUserId: string
): Promise<CryptoKey> {
  const { secret, a, b } = await derivePairSecret(ecdhPrivateKey, pair, myUserId);
  const salt = `love-interests|pair:${pair.id}`;
  const info = `aes-gcm|v1|a:${a}|b:${b}`;
  return hkdfAesKey(secret, salt, info);
}

export async function derivePairHmacKey(
  ecdhPrivateKey: CryptoKey,
  pair: PairView,
  myUserId: string
): Promise<CryptoKey> {
  const { secret, a, b } = await derivePairSecret(ecdhPrivateKey, pair, myUserId);
  const salt = `love-interests|pair:${pair.id}`;
  const info = `match-token-hmac|v1|a:${a}|b:${b}`;
  return hkdfHmacKey(secret, salt, info);
}
