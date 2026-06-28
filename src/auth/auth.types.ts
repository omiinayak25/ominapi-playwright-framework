/**
 * =============================================================================
 * auth.types.ts — The STRATEGY contract for authentication
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Defines the single interface every auth scheme implements. Because Basic,
 *   Bearer, API-key, and Cookie auth all reduce to "produce some HTTP headers",
 *   one tiny interface (`apply()`) lets them be swapped interchangeably — the
 *   essence of the Strategy pattern.
 *
 * DESIGN NOTE:
 *   `apply()` may be sync OR async. Static schemes (Basic/Bearer) are sync;
 *   future token-fetching schemes could be async. Returning a union and
 *   `await`-ing it at the call site supports both with no special-casing.
 * =============================================================================
 */

/** A set of HTTP headers an auth strategy injects into a request. */
export type AuthHeaders = Record<string, string>;

/**
 * The Strategy interface. Every concrete auth scheme implements `apply()` to
 * return the headers that authenticate a request.
 */
export interface AuthStrategy {
  /** Human-readable scheme name, used in logs (e.g. "Basic", "Bearer"). */
  readonly scheme: string;

  /** Produce the auth headers for a request (sync or async). */
  apply(): AuthHeaders | Promise<AuthHeaders>;
}
