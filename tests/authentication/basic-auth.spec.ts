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

test.describe('Phase 4 · Basic Auth (Strategy)', () => {
  test('valid credentials authenticate (postman-echo)', async ({ echo }) => {
    const res = await echo.get<EchoBasicAuth>('/basic-auth', {
      auth: new BasicAuthStrategy('postman', 'password'),
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authenticated).toBe(true);
  });

  test('missing credentials are rejected with 401', async ({ echo }) => {
    const res = await echo.get('/basic-auth', { auth: new NoAuthStrategy() });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  test('valid credentials authenticate (httpbin)', async ({ httpbin }) => {
    const res = await httpbin.get<HttpbinBasicAuth>(
      '/basic-auth/admin/secret',
      { auth: new BasicAuthStrategy('admin', 'secret') },
    );

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authorized).toBe(true);
    expect(res.body.user).toBe('admin');
  });

  test('wrong credentials are rejected with 401 (httpbin)', async ({
    httpbin,
  }) => {
    const res = await httpbin.get('/basic-auth/admin/secret', {
      auth: new BasicAuthStrategy('admin', 'WRONG'),
    });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });
});
