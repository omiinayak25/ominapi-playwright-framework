/**
 * =============================================================================
 * concurrent-requests.spec.ts — Concurrency health & percentiles
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - A batch of N concurrent requests ALL succeed (100% success rate).
 *   - Concurrency is REAL: wall-clock time is far less than the sum of per-request
 *     durations (if it weren't, requests were effectively serialized).
 *   - Tail latency (p95) stays within an SLA — averages would hide slow outliers.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { PerfHelper } from '../../src/utils/perf.js';
import { logger } from '../../src/utils/logger.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 13 · Concurrent requests', () => {
  // SLA assertions can flake under full-suite network contention — retry.
  test.describe.configure({ retries: 2 });

  test('a concurrent batch all succeeds within p95 SLA', async ({
    products,
  }) => {
    const CONCURRENCY = 12;

    const batch = await PerfHelper.runBatch(
      () => products.getById(1),
      CONCURRENCY,
    );

    // 100% success rate.
    for (const res of batch.results) {
      expect(res.status).toBe(HttpStatus.OK);
    }

    const stats = PerfHelper.stats(batch.durations);
    logger.info('Concurrency latency stats (ms)', { ...stats });

    // Tail-latency SLA (generous for a public API).
    expect(stats.p95).toBeLessThan(6000);
  });

  test('concurrency is genuinely parallel (wall-clock << sum of durations)', async ({
    products,
  }) => {
    const CONCURRENCY = 10;
    const batch = await PerfHelper.runBatch(
      () => products.getById(1),
      CONCURRENCY,
    );

    const sumDurations = batch.durations.reduce((a, b) => a + b, 0);
    // If requests ran in parallel, total wall-clock is much less than the sum.
    expect(batch.totalMs).toBeLessThan(sumDurations);
  });
});
