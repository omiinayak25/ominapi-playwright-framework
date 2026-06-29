/**
 * =============================================================================
 * cookie-token.strategy.ts — Cookie / Session Token Authentication (Strategy)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Session/cookie auth carries a token in the `Cookie` header:
 *   `Cookie: token=<token>`. The server issued this token at login and ties it
 *   to a session. Restful Booker uses EXACTLY this for PUT/PATCH/DELETE.
 *
 *   Difference vs Bearer: the token rides in the Cookie header (browser-style
 *   session) instead of Authorization. Same idea, different transport — which is
 *   precisely why each transport gets its own small Strategy.
 * =============================================================================
 */
import type { AuthStrategy, AuthHeaders } from '../auth.types.js';

/**
 * Auth strategy that carries a session token in the `Cookie` header.
 */
export class CookieTokenStrategy implements AuthStrategy {
  /** Identifies this strategy in logs/diagnostics. */
  public readonly scheme = 'CookieToken';

  /**
   * @param token - The session token value issued at login.
   * @param cookieName - Cookie key name; defaults to `token`.
   */
  public constructor(
    private readonly token: string,
    private readonly cookieName: string = 'token',
  ) {}

  /**
   * @returns A `Cookie: <name>=<token>` header.
   */
  public apply(): AuthHeaders {
    return { Cookie: `${this.cookieName}=${this.token}` };
  }
}
