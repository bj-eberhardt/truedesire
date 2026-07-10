import { bytesToArrayBuffer, bytesToBase64, utf8ToBytes } from "./base64";

export async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytesToArrayBuffer(utf8ToBytes(text)));
  return bytesToBase64(new Uint8Array(digest));
}

export async function signRequest(
  privateKey: CryptoKey,
  opts: {
    method: string;
    pathWithQuery: string;
    timestamp: string;
    nonce: string;
    bodyHashB64: string;
  }
): Promise<string> {
  const message = `${opts.method.toUpperCase()}\n${opts.pathWithQuery}\n${opts.timestamp}\n${opts.nonce}\n${opts.bodyHashB64}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    bytesToArrayBuffer(utf8ToBytes(message))
  );
  return bytesToBase64(new Uint8Array(signature));
}
