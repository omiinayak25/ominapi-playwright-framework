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

export class CookieTokenStrategy implements AuthStrategy {
  public readonly scheme = 'CookieToken';

  public constructor(
    private readonly token: string,
    private readonly cookieName: string = 'token',
  ) {}

  public apply(): AuthHeaders {
    return { Cookie: `${this.cookieName}=${this.token}` };
  }
}
