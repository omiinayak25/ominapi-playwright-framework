/**
 * =============================================================================
 * basic-auth.strategy.ts — HTTP Basic Authentication (Strategy)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Basic auth sends `Authorization: Basic base64(username:password)` on every
 *   request. It is simple but sends credentials on EVERY call (only safe over
 *   HTTPS). Used by Restful Booker (mutations), postman-echo, httpbin.
 *
 * WHY A STRATEGY:
 *   Encapsulates the base64 encoding once. Callers never compute it by hand —
 *   they just `new BasicAuthStrategy(user, pass)` and hand it to the client.
 * =============================================================================
 */
import type { AuthStrategy, AuthHeaders } from '../auth.types.js';

/**
 * Auth strategy that emits an HTTP Basic `Authorization` header.
 */
export class BasicAuthStrategy implements AuthStrategy {
  /** Identifies this strategy in logs/diagnostics. */
  public readonly scheme = 'Basic';

  /**
   * @param username - Account/user portion of the credential pair.
   * @param password - Secret portion of the credential pair.
   */
  public constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}

  /**
   * @returns An `Authorization: Basic <base64(user:pass)>` header.
   */
  public apply(): AuthHeaders {
    // Base64-encode "user:pass". Buffer is the Node-native, dependency-free way.
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString(
      'base64',
    );
    return { Authorization: `Basic ${encoded}` };
  }
}
