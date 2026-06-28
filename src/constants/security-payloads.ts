/**
 * =============================================================================
 * security-payloads.ts — Reusable malicious-input libraries (for AUTHORIZED testing)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Security tests fire known attack strings at inputs to verify the API handles
 *   them SAFELY (no 500, no data leak, no auth bypass, properly stored as data).
 *   Centralizing the payloads keeps tests DRY and the corpus easy to extend.
 *
 * ETHICS/SCOPE:
 *   These are standard OWASP-style test vectors used here against PUBLIC SANDBOX
 *   APIs for defensive/educational testing only.
 * =============================================================================
 */

/** SQL injection vectors — should never bypass auth or cause a 500. */
export const SQL_INJECTION_PAYLOADS: readonly string[] = [
  "' OR '1'='1",
  "'; DROP TABLE users;--",
  "' OR 1=1--",
  "admin'--",
  '" OR ""="',
];

/** XSS vectors — must be stored/returned as inert DATA (encoding is render-time). */
export const XSS_PAYLOADS: readonly string[] = [
  "<script>alert('xss')</script>",
  '<img src=x onerror=alert(1)>',
  '"><svg/onload=alert(1)>',
  'javascript:alert(1)',
];

/** Path-traversal vectors — must not expose the filesystem. */
export const PATH_TRAVERSAL_PAYLOADS: readonly string[] = [
  '../../etc/passwd',
  '..\\..\\windows\\system32\\config\\sam',
  '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
];
