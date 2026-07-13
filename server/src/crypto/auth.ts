import { createHash, randomUUID, webcrypto } from "node:crypto";

export function sha256Base64(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("base64");
}

export function signableMessage(opts: {
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  bodyHashB64: string;
}): Uint8Array {
  const text =
    `${opts.method.toUpperCase()}\n` +
    `${opts.pathWithQuery}\n` +
    `${opts.timestamp}\n` +
    `${opts.nonce}\n` +
    `${opts.bodyHashB64}`;

  return new TextEncoder().encode(text);
}

/**
 * Erstellt eine Kopie, deren zugrunde liegender Speicher garantiert
 * ein ArrayBuffer und kein SharedArrayBuffer ist.
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

export async function verifyRequestSignature(params: {
  signPublicJwk: JsonWebKey;
  method: string;
  pathWithQuery: string;
  timestamp: string;
  nonce: string;
  rawBody: Uint8Array;
  signatureB64: string;
}): Promise<boolean> {
  const signatureBytes = Buffer.from(params.signatureB64, "base64");
  const bodyHashB64 = sha256Base64(params.rawBody);

  const messageBytes = signableMessage({
    method: params.method,
    pathWithQuery: params.pathWithQuery,
    timestamp: params.timestamp,
    nonce: params.nonce,
    bodyHashB64
  });

  const key = await webcrypto.subtle.importKey(
    "jwk",
    params.signPublicJwk,
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["verify"]
  );

  return webcrypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256"
    },
    key,
    toArrayBuffer(signatureBytes),
    toArrayBuffer(messageBytes)
  );
}

export function newId(): string {
  return randomUUID();
}
