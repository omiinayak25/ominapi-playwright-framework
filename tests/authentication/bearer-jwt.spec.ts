/**
 * =============================================================================
 * bearer-jwt.spec.ts — Bearer tokens & JWT structure
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Bearer auth puts a token in `Authorization: Bearer <token>`. A JWT is the
 *   most common bearer token: three base64url parts `header.payload.signature`.
 *   From the client's view it's just a string — so ONE BearerTokenStrategy
 *   serves both "opaque bearer" and "JWT".
 *
 * WHAT WE PROVE:
 *   - A bearer token reaches the server (httpbin /bearer echoes it back).
 *   - A missing token is rejected (401).
 *   - A JWT has the expected 3-part structure (educational decode).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { BearerTokenStrategy, NoAuthStrategy } from '../../src/auth/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface BearerResponse {
  authenticated: boolean;
  token: string;
}

// A sample JWT (header.payload.signature). Not secret — for structure demo only.
const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + // header  {"alg":"HS256","typ":"JWT"}
  '.eyJzdWIiOiIxMjM0IiwibmFtZSI6Ik9tbmlBUEkifQ' + // payload {"sub":"1234","name":"OminAPI"}
  '.s5hZ8Z3qd2bVrqQ9m0Xb3pX1kY2tF7nQwErTyUiOpA'; // signature

// Suite: proves BearerTokenStrategy transmits any token string (opaque or JWT)
// in the Authorization header, plus the structural anatomy of a JWT.
test.describe('Phase 4 · Bearer / JWT (Strategy)', () => {
  // Scenario: send an opaque bearer token to httpbin /bearer.
  // Expected: 200, authenticated true, and the token echoed back unchanged.
  test('a bearer token is sent and accepted', async ({ httpbin }) => {
    const res = await httpbin.get<BearerResponse>('/bearer', {
      auth: new BearerTokenStrategy('opaque-token-abc123'),
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.token).toBe('opaque-token-abc123');
  });

  // Scenario: call /bearer with NoAuthStrategy (no Authorization header).
  // Expected: 401 — the resource requires a bearer token.
  test('a missing bearer token is rejected with 401', async ({ httpbin }) => {
    const res = await httpbin.get('/bearer', { auth: new NoAuthStrategy() });
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  // Scenario: a full JWT string is handed to the same strategy.
  // Expected: the dotted JWT survives transmission byte-for-byte (no mangling).
  test('a JWT is transmitted intact as a bearer token', async ({ httpbin }) => {
    const res = await httpbin.get<BearerResponse>('/bearer', {
      auth: new BearerTokenStrategy(SAMPLE_JWT),
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.token).toBe(SAMPLE_JWT);
  });

  // Scenario: pure-local inspection of the sample JWT (no network call).
  // Expected: exactly 3 dot-separated parts, and the base64url payload decodes to
  // JSON whose `name` claim is the value we encoded.
  test('a JWT has the expected 3-part structure and decodable payload', () => {
    const parts = SAMPLE_JWT.split('.');
    expect(parts).toHaveLength(3); // header.payload.signature

    // Decode the payload (middle part) — base64url -> JSON.
    const payloadPart = parts[1];
    expect(payloadPart).toBeDefined();
    const json = Buffer.from(payloadPart as string, 'base64url').toString(
      'utf-8',
    );
    const payload = JSON.parse(json) as { sub: string; name: string };
    expect(payload.name).toBe('OminAPI');
  });
});
