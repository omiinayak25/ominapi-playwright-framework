/**
 * =============================================================================
 * oauth2-simulation.spec.ts — OAuth2 flow (simulated)
 * -----------------------------------------------------------------------------
 * CONCEPT (OAuth2 in one breath):
 *   OAuth2 separates two roles:
 *     - Authorization Server: issues an access token after you authenticate.
 *     - Resource Server: accepts that token (as `Authorization: Bearer`) to grant
 *       access to protected resources.
 *   The CLIENT's job in code is always the same two steps:
 *     (1) obtain a token from the auth server, (2) present it to the resource server.
 *
 * WHY "SIMULATION":
 *   There is no free, key-less OAuth2 client-credentials sandbox. So we MODEL the
 *   flow honestly: Restful Booker's /auth plays the Authorization Server (returns
 *   a token), and httpbin's /bearer plays the Resource Server (validates a bearer
 *   token). The PATTERN — AuthService to get a token, BearerTokenStrategy to send
 *   it — is exactly what you use against a real OAuth2 provider.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { BearerTokenStrategy } from '../../src/auth/index.js';
import { config } from '../../src/config/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface BearerResponse {
  authenticated: boolean;
  token: string;
}

// Suite: models the two-step OAuth2 client flow using two stand-in services
// (auth server -> token, resource server -> validates the bearer token).
test.describe('Phase 4 · OAuth2 flow (simulated)', () => {
  // Scenario: log in to obtain a token, then use it to reach a protected resource.
  // Expected: a truthy token, then 200/authenticated with that exact token echoed.
  test('obtain a token from the auth server, then access a protected resource', async ({
    auth,
    httpbin,
  }) => {
    // STEP 1 — Authorization Server: exchange credentials for an access token.
    const accessToken = await auth.loginBooker(
      config.credentials.username,
      config.credentials.password,
    );
    expect(accessToken).toBeTruthy();

    // STEP 2 — Resource Server: present the token as a Bearer credential.
    const res = await httpbin.get<BearerResponse>('/bearer', {
      auth: new BearerTokenStrategy(accessToken),
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.token).toBe(accessToken);
  });
});
