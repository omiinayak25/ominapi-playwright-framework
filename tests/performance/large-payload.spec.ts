/**
 * =============================================================================
 * large-payload.spec.ts — Large request & response handling
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   APIs must handle big bodies in both directions:
 *     - LARGE RESPONSE: fetch the full product catalog (limit=0 -> all items),
 *       assert completeness, payload size, and that it arrives within budget.
 *     - LARGE REQUEST: POST a big JSON array and confirm it round-trips intact.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { PerfHelper } from '../../src/utils/perf.js';
import { logger } from '../../src/utils/logger.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

test.describe('Phase 13 · Large payloads', () => {
  test('LARGE RESPONSE: full catalog is complete and within budget', async ({
    products,
  }) => {
    const { result, durationMs } = await PerfHelper.measure(() =>
      products.getAll(0, 0),
    ); // limit=0 -> DummyJSON returns ALL products

    expect(result.status).toBe(HttpStatus.OK);
    expect(result.body.products.length).toBe(result.body.total); // complete
    expect(result.body.products.length).toBeGreaterThan(100);
    expect(result.sizeBytes).toBeGreaterThan(100_000); // a genuinely large body

    logger.info('Large response', {
      items: result.body.products.length,
      sizeKB: Math.round(result.sizeBytes / 1024),
      durationMs,
    });
    expect(durationMs).toBeLessThan(15_000); // generous budget for a big payload
  });

  test('LARGE REQUEST: a big JSON array round-trips intact', async ({
    echo,
  }) => {
    // Build a sizable payload (~1000 records).
    const bigArray = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `item-${i}`,
      value: i * 7,
    }));

    const res = await echo.post<PostmanEcho>('/post', {
      data: { items: bigArray },
    });

    expect(res.status).toBe(HttpStatus.OK);
    const echoed = res.body.json as { items: unknown[] };
    expect(echoed.items).toHaveLength(1000); // server received the whole array
  });
});
