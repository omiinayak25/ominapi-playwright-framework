/**
 * =============================================================================
 * response-time-sla.spec.ts — Response-time SLA validation
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   An SLA is a promised performance budget. We validate it at two levels:
 *     - single request: one call within a per-request budget,
 *     - aggregate: across a sample, avg AND p95 within budget (tail matters).
 *   The ApiResponse already carries durationMs, so SLA checks are first-class.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { PerfHelper } from '../../src/utils/perf.js';
import { expectResponseTimeUnder } from '../../src/validators/index.js';
import { logger } from '../../src/utils/logger.js';

test.describe('Phase 13 · Response-time SLA', () => {
  // SLA assertions can flake under full-suite network contention — retry.
  test.describe.configure({ retries: 2 });

  const SINGLE_SLA_MS = 4000;
  const AGG_P95_SLA_MS = 5000;

  test('a single request meets the per-request SLA', async ({ products }) => {
    const res = await products.getById(1);
    expectResponseTimeUnder(res, SINGLE_SLA_MS);
  });

  test('aggregate latency (avg & p95) meets SLA across a sample', async ({
    products,
  }) => {
    const batch = await PerfHelper.runBatch(() => products.getById(1), 8);
    const stats = PerfHelper.stats(batch.durations);
    logger.info('SLA sample stats (ms)', { ...stats });

    expect(stats.avg).toBeLessThan(AGG_P95_SLA_MS);
    expect(stats.p95).toBeLessThan(AGG_P95_SLA_MS);
  });
});
