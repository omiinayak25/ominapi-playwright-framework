/**
 * =============================================================================
 * security.validator.ts — Security-focused response checks
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Two recurring security assertions deserve reusable helpers:
 *     1) findSensitiveData() — deep-scan a body for fields that should NEVER be
 *        returned (password, token, secret, ...). Catches data-exposure bugs.
 *     2) auditSecurityHeaders() — report which standard security headers are
 *        present vs missing (HSTS, X-Content-Type-Options, X-Frame-Options, CSP).
 * =============================================================================
 */

/** Field names that should never appear in a response body. */
const SENSITIVE_KEYS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'ssn',
  'creditcard',
];

/** Recursively collect any sensitive key names present (with non-empty values). */
export function findSensitiveData(body: unknown, path = ''): string[] {
  const hits: string[] = [];

  if (Array.isArray(body)) {
    body.forEach((item, i) =>
      hits.push(...findSensitiveData(item, `${path}[${i}]`)),
    );
    return hits;
  }
  if (body !== null && typeof body === 'object') {
    for (const [key, value] of Object.entries(body)) {
      const here = path ? `${path}.${key}` : key;
      if (
        SENSITIVE_KEYS.includes(key.toLowerCase()) &&
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        hits.push(here);
      }
      hits.push(...findSensitiveData(value, here));
    }
  }
  return hits;
}

export interface SecurityHeaderReport {
  readonly present: string[];
  readonly missing: string[];
}

/** Standard hardening headers a secure API SHOULD send. */
const EXPECTED_SECURITY_HEADERS: readonly string[] = [
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'content-security-policy',
];

/** Report which expected security headers are present vs missing. */
export function auditSecurityHeaders(
  headers: Record<string, string>,
): SecurityHeaderReport {
  const present: string[] = [];
  const missing: string[] = [];
  for (const h of EXPECTED_SECURITY_HEADERS) {
    if (headers[h] !== undefined) present.push(h);
    else missing.push(h);
  }
  return { present, missing };
}
