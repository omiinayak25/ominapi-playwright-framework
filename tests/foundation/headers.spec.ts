/**
 * =============================================================================
 * headers.spec.ts — Request & response headers
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Headers carry metadata: content negotiation (Accept/Content-Type), auth
 *   (Authorization), tracing (X-Correlation-Id), etc. We assert BOTH directions:
 *     - Request headers we SEND are received (echo reflects them under headers).
 *     - Response headers we RECEIVE have expected values (content-type).
 *
 * NOTE on casing:
 *   postman-echo lower-cases the request header keys it echoes back, so we read
 *   `body.headers['x-correlation-id']`. Playwright also lower-cases RESPONSE
 *   header keys (HTTP headers are case-insensitive by spec).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

// Suite: verifies request headers are sent and response headers are readable.
test.describe('Phase 2 · Headers', () => {
  // Scenario: send custom headers on a GET request.
  // Expected: the echo service reflects each custom header back (lower-cased).
  test('custom request headers are sent to the server', async ({ echo }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      headers: {
        'X-Correlation-Id': 'ominapi-12345',
        'X-Custom-Header': 'phase-2',
      },
    });

    expect(res.status).toBe(200);
    // echo reflects received headers (lower-cased) under `headers`.
    expect(res.body.headers['x-correlation-id']).toBe('ominapi-12345');
    expect(res.body.headers['x-custom-header']).toBe('phase-2');
  });

  // Scenario: read headers off the response.
  // Expected: content-type is accessible via a lower-cased key and is JSON.
  test('response headers are readable and normalized to lower-case', async ({
    echo,
  }) => {
    const res = await echo.get('/get');

    // Playwright lower-cases response header keys — assert against that.
    expect(res.headers['content-type']).toContain('application/json');
  });
});
