/**
 * =============================================================================
 * bearer-token.strategy.ts — Bearer Token / JWT Authentication (Strategy)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Bearer auth sends `Authorization: Bearer <token>`. "Bearer" = "whoever holds
 *   this token is authorized" — so the token must be protected.
 *
 *   A JWT (JSON Web Token) is the most common bearer token: three base64url
 *   parts `header.payload.signature`. The server VERIFIES the signature, so the
 *   token is tamper-evident. From the CLIENT's perspective it's just a string in
 *   this header — which is why ONE strategy covers both "bearer" and "JWT".
 *
 * WHY A STRATEGY:
 *   The token usually comes from a prior login (see AuthService). This strategy
 *   just formats it, decoupling "how we got the token" from "how we send it".
 * =============================================================================
 */
import type { AuthStrategy, AuthHeaders } from '../auth.types.js';

export class BearerTokenStrategy implements AuthStrategy {
  public readonly scheme = 'Bearer';

  public constructor(private readonly token: string) {}

  public apply(): AuthHeaders {
    return { Authorization: `Bearer ${this.token}` };
  }
}
