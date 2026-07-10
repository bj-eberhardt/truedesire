import { base64ToBytes, bytesToArrayBuffer, bytesToBase64 } from "./base64";

export type KeyBundle = {
  signPrivateJwk: JsonWebKey;
  signPublicJwk: JsonWebKey;
  ecdhPrivateJwk: JsonWebKey;
  ecdhPublicRawB64: string;
};

export type RuntimeKeys = {
  signPrivateKey: CryptoKey;
  signPublicKey: CryptoKey;
  ecdhPrivateKey: CryptoKey;
  ecdhPublicRawB64: string;
};

export async function generateKeys(): Promise<KeyBundle> {
  const sign = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify"
  ]);
  const ecdh = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits"
  ]);

  const signPrivateJwk = await crypto.subtle.exportKey("jwk", sign.privateKey);
  const signPublicJwk = await crypto.subtle.exportKey("jwk", sign.publicKey);
  const ecdhPrivateJwk = await crypto.subtle.exportKey("jwk", ecdh.privateKey);
  const ecdhPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ecdh.publicKey));

  return {
    signPrivateJwk,
    signPublicJwk,
    ecdhPrivateJwk,
    ecdhPublicRawB64: bytesToBase64(ecdhPublicRaw)
  };
}

export async function importRuntimeKeys(bundle: KeyBundle): Promise<RuntimeKeys> {
  const signPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.signPrivateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  const signPublicKey = await crypto.subtle.importKey(
    "jwk",
    bundle.signPublicJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const ecdhPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.ecdhPrivateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  return {
    signPrivateKey,
    signPublicKey,
    ecdhPrivateKey,
    ecdhPublicRawB64: bundle.ecdhPublicRawB64
  };
}

export async function importEcdhPublicKey(rawB64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(rawB64);
  return crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(raw),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}
