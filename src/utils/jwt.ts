/**
 * =============================================================================
 * jwt.ts — JWT decode & tamper utilities (for security testing)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   JWT manipulation tests verify a server REJECTS tampered tokens. To produce
 *   tampered tokens we need to decode, modify, and re-encode JWTs. This util
 *   provides exactly that — no crypto library needed, because we are forging
 *   INVALID tokens on purpose (the signature won't match, which is the point).
 *
 * JWT REFRESHER:
 *   A JWT is `base64url(header).base64url(payload).signature`. The server
 *   recomputes the signature over header+payload with its secret; if it doesn't
 *   match, the token must be rejected. Attacks: tamper the payload (privilege
 *   escalation) or set alg:"none" (skip signature). A secure server defeats both.
 * =============================================================================
 */

type JsonObject = Record<string, unknown>;

export interface DecodedJwt {
  readonly header: JsonObject;
  readonly payload: JsonObject;
  readonly signature: string;
}

function b64urlEncode(obj: JsonObject): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function b64urlDecode(part: string): JsonObject {
  const json = Buffer.from(part, 'base64url').toString('utf-8');
  return JSON.parse(json) as JsonObject;
}

/** Decode a JWT's header & payload (does NOT verify the signature). */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`[jwt] Expected 3 parts, got ${parts.length}`);
  }
  const [h, p, s] = parts as [string, string, string];
  return { header: b64urlDecode(h), payload: b64urlDecode(p), signature: s };
}

/** Forge a JWT from header/payload with an arbitrary (fake) signature. */
export function createJwt(
  payload: JsonObject,
  options: { alg?: string; signature?: string } = {},
): string {
  const header = { alg: options.alg ?? 'HS256', typ: 'JWT' };
  const signature = options.signature ?? 'omni-fake-signature';
  return `${b64urlEncode(header)}.${b64urlEncode(payload)}.${signature}`;
}

/**
 * Tamper a token's payload (e.g. escalate role) while KEEPING the original
 * signature — producing a token whose signature no longer matches its payload.
 * A secure server must reject this.
 */
export function tamperPayload(token: string, changes: JsonObject): string {
  const { header, payload, signature } = decodeJwt(token);
  const newPayload = { ...payload, ...changes };
  return `${b64urlEncode(header)}.${b64urlEncode(newPayload)}.${signature}`;
}

/**
 * Produce an `alg:"none"` variant with an EMPTY signature — the classic
 * "unsigned token" attack. A secure server must reject alg:none.
 */
export function toAlgNone(token: string): string {
  const { payload } = decodeJwt(token);
  const header = { alg: 'none', typ: 'JWT' };
  return `${b64urlEncode(header)}.${b64urlEncode(payload)}.`;
}
