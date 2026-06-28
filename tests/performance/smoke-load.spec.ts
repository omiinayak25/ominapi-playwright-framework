/**
 * =============================================================================
 * smoke-load.spec.ts — Smoke load (sustained small load, success rate)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Smoke load runs several rounds of concurrent requests to confirm the API
 *   stays healthy under modest sustained traffic: a 100% success rate, no 5xx,
 *   and a reported throughput (requests/second). This is a sanity gate, not a
 *   full load test.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { PerfHelper } from '../../src/utils/perf.js';
import { logger } from '../../src/utils/logger.js';

test.describe('Phase 13 · Smoke load', () => {
  test('sustained rounds keep a 100% success rate with no 5xx', async ({
    echo,
  }) => {
    const ROUNDS = 3;
    const PER_ROUND = 5;

    let ok = 0;
    let serverErrors = 0;
    const allDurations: number[] = [];
    const start = Date.now();

    for (let round = 0; round < ROUNDS; round++) {
      const batch = await PerfHelper.runBatch(
        () => echo.get('/get'),
        PER_ROUND,
      );
      allDurations.push(...batch.durations);
      for (const res of batch.results) {
        if (res.status >= 200 && res.status < 300) ok++;
        if (res.status >= 500) serverErrors++;
      }
    }

    const totalRequests = ROUNDS * PER_ROUND;
    const elapsedSec = (Date.now() - start) / 1000;
    const throughput = (totalRequests / elapsedSec).toFixed(1);
    logger.info('Smoke load summary', {
      totalRequests,
      ok,
      serverErrors,
      throughputPerSec: throughput,
      stats: PerfHelper.stats(allDurations),
    });

    expect(serverErrors).toBe(0);
    expect(ok).toBe(totalRequests); // 100% success
  });
});
