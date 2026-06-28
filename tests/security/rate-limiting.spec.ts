/**
 * =============================================================================
 * rate-limiting.spec.ts — Behavior under a burst of requests
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Rate limiting protects an API from abuse, typically returning 429 Too Many
 *   Requests once a threshold is crossed. We fire a concurrent BURST and assert
 *   the API stays HEALTHY: every response is either a success or a deliberate
 *   429 — never a 5xx crash. (Public demo APIs often don't rate-limit, so we
 *   assert the resilient outcome and DETECT 429s if the server enforces them.)
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 12 · Rate limiting / burst resilience', () => {
  test('a concurrent burst yields only success or 429 (no 5xx)', async ({
    echo,
  }) => {
    const BURST = 15;

    // Fire all requests concurrently.
    const responses = await Promise.all(
      Array.from({ length: BURST }, () => echo.get('/get')),
    );

    const statuses = responses.map((r) => r.status);
    const rateLimited = statuses.filter(
      (s) => s === HttpStatus.TOO_MANY_REQUESTS,
    ).length;
    const serverErrors = statuses.filter((s) => s >= 500).length;

    // Health invariant: the burst must not crash the server.
    expect(serverErrors).toBe(0);
    // Every status is either OK or a deliberate 429.
    for (const s of statuses) {
      expect([HttpStatus.OK, HttpStatus.TOO_MANY_REQUESTS]).toContain(s);
    }
    // Informational: how many (if any) were throttled.
    expect(rateLimited).toBeGreaterThanOrEqual(0);
  });
});
