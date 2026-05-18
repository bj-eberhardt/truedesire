import { webcrypto } from 'node:crypto'
import { createHash, randomUUID } from 'node:crypto'

export type AuthContext = {
  userId: string
}

export type AuthHeaders = {
  userId: string
  timestamp: string
  nonce: string
  signatureB64: string
}

export function sha256Base64(data: Uint8Array): string {
  const digest = createHash('sha256').update(data).digest()
  return digest.toString('base64')
}

export function signableMessage(opts: {
  method: string
  pathWithQuery: string
  timestamp: string
  nonce: string
  bodyHashB64: string
}): Uint8Array {
  const text = `${opts.method.toUpperCase()}\n${opts.pathWithQuery}\n${opts.timestamp}\n${opts.nonce}\n${opts.bodyHashB64}`
  return new TextEncoder().encode(text)
}

export async function verifyRequestSignature(params: {
  signPublicJwk: JsonWebKey
  method: string
  pathWithQuery: string
  timestamp: string
  nonce: string
  rawBody: Uint8Array
  signatureB64: string
}): Promise<boolean> {
  const signature = Buffer.from(params.signatureB64, 'base64')
  const bodyHashB64 = sha256Base64(params.rawBody)
  const message = signableMessage({
    method: params.method,
    pathWithQuery: params.pathWithQuery,
    timestamp: params.timestamp,
    nonce: params.nonce,
    bodyHashB64,
  })

  const key = await webcrypto.subtle.importKey(
    'jwk',
    params.signPublicJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  )

  return webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    signature,
    message,
  )
}

export function newId(): string {
  return randomUUID()
}

