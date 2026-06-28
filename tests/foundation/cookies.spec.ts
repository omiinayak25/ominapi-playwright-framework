/**
 * =============================================================================
 * cookies.spec.ts — Cookies over HTTP
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Cookies are key/value pairs the server sets (Set-Cookie) and the client
 *   returns on later requests (Cookie header). They underpin session auth
 *   (Phase 4). A Playwright request context persists cookies across calls made
 *   through the SAME context — exactly what our per-client fixture provides.
 *
 * WHAT THIS TEACHES:
 *   - The server can instruct the client to store a cookie.
 *   - Within one client (one request context), cookies persist between calls.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import type { HttpbinCookies } from '../../src/types/httpbin.types.js';

test.describe('Phase 2 · Cookies', () => {
  test('a cookie set by the server is sent back on the next request', async ({
    echo,
  }) => {
    // 1) Ask echo to set a cookie. It responds 302 -> /cookies; the context
    //    follows the redirect and stores the cookie automatically.
    await echo.get('/cookies/set?sessionId=omni-abc-123');

    // 2) A follow-up call on the SAME client returns the stored cookie.
    const res = await echo.get<HttpbinCookies>('/cookies');

    expect(res.status).toBe(200);
    expect(res.body.cookies.sessionId).toBe('omni-abc-123');
  });
});
