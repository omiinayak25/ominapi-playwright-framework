/**
 * =============================================================================
 * status-codes.spec.ts — Reading & asserting HTTP status codes
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Status codes are the API's primary success/failure signal. postman-echo's
 *   /status/{code} endpoint returns the requested code, so we can verify our
 *   client surfaces them correctly — INCLUDING 4xx/5xx WITHOUT throwing
 *   (failOnStatusCode defaults to false), which is essential for negative tests.
 *
 * WHAT THIS TEACHES:
 *   - Using named HttpStatus constants instead of magic numbers.
 *   - `res.ok` is true only for 2xx.
 *   - Data-driven assertion over a list of codes (a taste of Phase 8).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

// Suite: confirms the client surfaces 2xx/4xx/5xx codes without throwing.
test.describe('Phase 2 · Status codes', () => {
  // Scenario: request a 200 status.
  // Expected: status is 200 and res.ok is true.
  test('200 OK is reported as ok', async ({ echo }) => {
    const res = await echo.get(`/status/${HttpStatus.OK}`);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.ok).toBe(true);
  });

  // Scenario: request a 404 status.
  // Expected: returned (not thrown) with status 404 and res.ok false.
  test('404 Not Found is returned, not thrown', async ({ echo }) => {
    const res = await echo.get(`/status/${HttpStatus.NOT_FOUND}`);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.ok).toBe(false); // 4xx is not ok
  });

  // Scenario: request a 500 status.
  // Expected: surfaced (not thrown) with status 500 and res.ok false.
  test('500 Internal Server Error is surfaced for assertion', async ({
    echo,
  }) => {
    const res = await echo.get(`/status/${HttpStatus.INTERNAL_SERVER_ERROR}`);
    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.ok).toBe(false);
  });

  // Data-driven: same assertion logic across many codes (DRY).
  for (const code of [
    HttpStatus.OK,
    HttpStatus.CREATED,
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
  ]) {
    // Scenario (parameterized): request each code in the list.
    // Expected: status matches and res.ok is true only for codes below 400.
    test(`status ${code} round-trips correctly`, async ({ echo }) => {
      const res = await echo.get(`/status/${code}`);
      expect(res.status).toBe(code);
      expect(res.ok).toBe(code < 400);
    });
  }
});
