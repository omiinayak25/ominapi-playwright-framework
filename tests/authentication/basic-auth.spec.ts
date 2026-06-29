/**
 * =============================================================================
 * basic-auth.spec.ts — HTTP Basic Authentication
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Basic auth = base64(username:password) in the Authorization header. We prove
 *   BOTH the happy path (valid creds -> authenticated) AND the negative path
 *   (no/invalid creds -> 401). Negative auth tests are as important as positive.
 *
 * STRATEGY PATTERN IN ACTION:
 *   The test never builds the header — it hands a BasicAuthStrategy to the client
 *   via the per-request `auth` option. Swapping schemes = swapping the object.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { BasicAuthStrategy, NoAuthStrategy } from '../../src/auth/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface EchoBasicAuth {
  authenticated: boolean;
}
interface HttpbinBasicAuth {
  authorized: boolean;
  user: string;
}

// Suite: exercises BasicAuthStrategy on two providers, covering both the
// positive (valid creds -> authenticated) and negative (bad/no creds -> 401) paths.
test.describe('Phase 4 · Basic Auth (Strategy)', () => {
  // Scenario: known-good postman-echo credentials.
  // Expected: 200 and the response flags the request as authenticated.
  test('valid credentials authenticate (postman-echo)', async ({ echo }) => {
    const res = await echo.get<EchoBasicAuth>('/basic-auth', {
      auth: new BasicAuthStrategy('postman', 'password'),
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authenticated).toBe(true);
  });

  // Scenario: hit the protected endpoint with NoAuthStrategy (no header sent).
  // Expected: 401 Unauthorized — the server demands credentials.
  test('missing credentials are rejected with 401', async ({ echo }) => {
    const res = await echo.get('/basic-auth', { auth: new NoAuthStrategy() });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  // Scenario: same strategy against httpbin, whose endpoint encodes the expected
  // user/pass in the path (/basic-auth/admin/secret).
  // Expected: 200, authorized true, and the echoed user is 'admin'.
  test('valid credentials authenticate (httpbin)', async ({ httpbin }) => {
    const res = await httpbin.get<HttpbinBasicAuth>(
      '/basic-auth/admin/secret',
      { auth: new BasicAuthStrategy('admin', 'secret') },
    );

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authorized).toBe(true);
    expect(res.body.user).toBe('admin');
  });

  // Scenario: correct username but wrong password against httpbin.
  // Expected: 401 — credentials are actually validated, not just present.
  test('wrong credentials are rejected with 401 (httpbin)', async ({
    httpbin,
  }) => {
    const res = await httpbin.get('/basic-auth/admin/secret', {
      auth: new BasicAuthStrategy('admin', 'WRONG'),
    });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});
