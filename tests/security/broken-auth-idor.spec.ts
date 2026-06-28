/**
 * =============================================================================
 * broken-auth-idor.spec.ts — Broken authentication & authorization (IDOR)
 * -----------------------------------------------------------------------------
 * CONCEPTS:
 *   - BROKEN AUTHENTICATION: weak/empty/invalid credentials must not yield a
 *     session. We confirm empty creds get no token.
 *   - AUTHORIZATION / IDOR (Insecure Direct Object Reference): attempting to
 *     mutate a resource by id WITHOUT proper authorization must be blocked. On
 *     Booker, protected mutations require a token, so an unauthorized DELETE of
 *     an arbitrary booking id is rejected (403) — the IDOR check pattern.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { NoAuthStrategy, CookieTokenStrategy } from '../../src/auth/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface AuthAttempt {
  token?: string;
}

test.describe('Phase 12 · Broken auth & IDOR', () => {
  test.describe.configure({ retries: 2 });

  test('empty credentials do not produce a token', async ({ booker }) => {
    const res = await booker.post<AuthAttempt>('/auth', {
      data: { username: '', password: '' },
    });
    expect(res.body.token).toBeUndefined();
  });

  test('IDOR: unauthorized DELETE of an arbitrary booking id is blocked', async ({
    booker,
  }) => {
    // Attacker tries to delete resource id 1 with NO credentials.
    const res = await booker.del('/booking/1', { auth: new NoAuthStrategy() });
    expect(res.status).toBe(HttpStatus.FORBIDDEN);
  });

  test('IDOR: forged session token does not authorize the mutation', async ({
    booker,
  }) => {
    const res = await booker.del('/booking/1', {
      auth: new CookieTokenStrategy('forged-session-id'),
    });
    expect(res.status).toBe(HttpStatus.FORBIDDEN);
  });
});
