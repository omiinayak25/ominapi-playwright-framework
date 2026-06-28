/**
 * =============================================================================
 * auth.service.ts — AuthService: obtains tokens via login (the "token endpoint")
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Strategies format a token into headers, but SOMETHING must first OBTAIN that
 *   token by logging in. AuthService encapsulates those login flows so tests
 *   don't repeat the POST-and-extract dance. This is also the building block for
 *   OAuth2-style flows: AuthService = "get token", Strategy = "present token".
 *
 * DESIGN:
 *   It depends on an injected ApiClient (DI) bound to the auth server's base URL.
 *   It FAILS FAST with a clear error if a token isn't returned — a missing token
 *   should crash the test setup loudly, not produce confusing 403s later.
 * =============================================================================
 */
import type { ApiClient } from '../api-client/index.js';
import type { AuthTokenResponse } from '../models/booking.model.js';

export class AuthService {
  public constructor(private readonly client: ApiClient) {}

  /**
   * Logs into Restful Booker and returns the session token.
   * POST /auth { username, password } -> { token }.
   */
  public async loginBooker(
    username: string,
    password: string,
  ): Promise<string> {
    const res = await this.client.post<AuthTokenResponse>('/auth', {
      data: { username, password },
    });

    const token = res.body?.token;
    if (res.status !== 200 || !token) {
      throw new Error(
        `[AuthService] Booker login failed (status ${res.status}). ` +
          `Body: ${res.rawText}`,
      );
    }
    return token;
  }
}
