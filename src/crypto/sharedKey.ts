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

export async function derivePairAesKey(
  ecdhPrivateKey: CryptoKey,
  pair: PairView,
  myUserId: string
): Promise<CryptoKey> {
  const partner = pair.partner;
  if (!partner) throw new Error("pair_not_complete");
  const partnerPub = await importEcdhPublicKey(partner.ecdhPublicRawB64);
  const secret = await deriveEcdhSecret(ecdhPrivateKey, partnerPub);

  const salt = `love-interests|pair:${pair.id}`;
  const [a, b] = [myUserId, partner.id].sort();
  const info = `aes-gcm|v1|a:${a}|b:${b}`;
  return hkdfAesKey(secret, salt, info);
}
