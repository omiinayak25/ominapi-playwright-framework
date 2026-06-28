/**
 * =============================================================================
 * params.spec.ts — Query parameters & path parameters
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   - QUERY params (?key=value) filter/shape a request; order-independent,
 *     optional. Passed via RequestOptions.params (auto URL-encoded).
 *   - PATH params identify a specific resource (/status/{code}); part of the URL
 *     itself, built into the path string.
 *
 * WHAT THIS TEACHES:
 *   - Never hand-concatenate query strings — pass `params` and let the client
 *     encode them safely (handles spaces, &, special chars).
 *   - Build path params via template strings.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

test.describe('Phase 2 · Parameters', () => {
  test('query parameters are encoded and sent correctly', async ({ echo }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      params: { page: 2, search: 'omni api', active: true },
    });

    expect(res.status).toBe(200);
    // echo reflects query args (always as strings) under `args`.
    expect(res.body.args.page).toBe('2');
    expect(res.body.args.search).toBe('omni api'); // space handled by encoder
    expect(res.body.args.active).toBe('true');
  });

  test('path parameter selects a specific resource', async ({ echo }) => {
    // The {code} segment is a PATH parameter identifying the resource.
    const code = 404;
    const res = await echo.get(`/status/${code}`);
    expect(res.status).toBe(code);
  });

  test('special characters in query values are safely encoded', async ({
    echo,
  }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      params: { q: 'a&b=c d' },
    });
    expect(res.body.args.q).toBe('a&b=c d');
  });
});
