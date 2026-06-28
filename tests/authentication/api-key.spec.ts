/**
 * =============================================================================
 * api-key.spec.ts — API Key Authentication
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   An API key is a static secret identifying the CALLING APP, sent in a custom
 *   header (e.g. x-api-key). We prove the key is transmitted by having the echo
 *   service reflect our request headers back.
 *
 * NOTE: ReqRes (the classic API-key demo) now requires a registered key, so we
 *   demonstrate the mechanism generically via postman-echo's header reflection.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { ApiKeyStrategy } from '../../src/auth/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

test.describe('Phase 4 · API Key (Strategy)', () => {
  test('an API key is sent in the configured header', async ({ echo }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      auth: new ApiKeyStrategy('x-api-key', 'omni-secret-key-123'),
    });

    expect(res.status).toBe(HttpStatus.OK);
    // echo reflects request headers (lower-cased) under `headers`.
    expect(res.body.headers['x-api-key']).toBe('omni-secret-key-123');
  });

  test('a different header name is supported (reusable strategy)', async ({
    echo,
  }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      auth: new ApiKeyStrategy('X-RapidAPI-Key', 'rapid-789'),
    });

    expect(res.body.headers['x-rapidapi-key']).toBe('rapid-789');
  });
});
