/**
 * =============================================================================
 * http-status.ts — Named HTTP status code constants
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Magic numbers like `expect(res.status()).toBe(201)` are unreadable and
 *   error-prone. `HttpStatus.CREATED` documents intent and is impossible to
 *   typo into a valid-but-wrong number silently.
 *
 * WHAT PROBLEM IT SOLVES (DRY + Clean Code):
 *   One canonical list of status codes the whole framework shares, used heavily
 *   from Phase 2 (Foundation) through Phase 12 (Security/negative testing).
 *
 * DESIGN NOTE:
 *   `as const` makes every value a literal type (e.g. 201, not number) and the
 *   whole object deeply readonly — so it doubles as a type-safe enum.
 * =============================================================================
 */
export const HttpStatus = {
  // 2xx — Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx — Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx — Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx — Server errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/** Union of all valid status code values — useful for typing helpers. */
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];
