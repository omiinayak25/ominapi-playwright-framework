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

// Suite: covers query-string and path parameter handling.
test.describe('Phase 2 · Parameters', () => {
  // Scenario: pass mixed-type query params via the `params` option.
  // Expected: all values arrive (echoed as strings) under `args`, correctly encoded.
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

  // Scenario: a path parameter built into the URL (/status/{code}).
  // Expected: the server responds with the status matching the path value.
  test('path parameter selects a specific resource', async ({ echo }) => {
    // The {code} segment is a PATH parameter identifying the resource.
    const code = 404;
    const res = await echo.get(`/status/${code}`);
    expect(res.status).toBe(code);
  });

  // Scenario: a query value containing reserved characters (&, =, space).
  // Expected: the encoder transmits them safely and the original value is echoed back.
  test('special characters in query values are safely encoded', async ({
    echo,
  }) => {
    const res = await echo.get<PostmanEcho>('/get', {
      params: { q: 'a&b=c d' },
    });
    expect(res.body.args.q).toBe('a&b=c d');
  });
});
