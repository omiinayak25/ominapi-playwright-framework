/**
 * =============================================================================
 * offset-pagination.spec.ts — Offset/limit pagination (DummyJSON)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Offset pagination uses skip (offset) + limit. The CRITICAL INVARIANTS a
 *   tester must verify are not just "a page came back" but:
 *     - the page honors the requested limit,
 *     - consecutive pages DO NOT OVERLAP (no duplicate ids),
 *     - the reported total stays constant,
 *     - skipping past the end yields an empty page.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 10 · Offset/limit pagination', () => {
  // A single page must return exactly `limit` items, echo that limit, and
  // report a total larger than one page (so paging is actually needed).
  test('a page honors limit and reports a stable total', async ({
    products,
  }) => {
    const res = await products.getAll(5, 0);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.products).toHaveLength(5);
    expect(res.body.limit).toBe(5);
    expect(res.body.total).toBeGreaterThan(5);
  });

  // Fetch two adjacent pages; expect zero shared ids (no overlap/gaps) and an
  // unchanged total — the core integrity guarantee of offset paging.
  test('consecutive pages do not overlap', async ({ products }) => {
    const page1 = await products.getAll(5, 0);
    const page2 = await products.getAll(5, 5);

    const ids1 = page1.body.products.map((p) => p.id);
    const ids2 = page2.body.products.map((p) => p.id);

    // No id from page 1 should appear in page 2 (no overlap / no gaps).
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
    expect(page1.body.total).toBe(page2.body.total); // total is stable
  });

  // Skipping beyond the dataset should still be a valid 200 with an empty list,
  // not an error — graceful end-of-data behavior.
  test('skipping past the end yields an empty page', async ({ products }) => {
    const res = await products.getAll(5, 100_000);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.products).toHaveLength(0);
  });

  // Demonstrate cursor-like iteration on an offset API: advance skip by
  // pageSize each call and expect the next batch to start at a different id.
  test('CURSOR-style: treat skip as an opaque cursor advanced each call', async ({
    products,
  }) => {
    // Offset can EMULATE cursor semantics: the "next cursor" is the next skip.
    const pageSize = 4;
    let cursor = 0;
    const firstBatch = (await products.getAll(pageSize, cursor)).body.products;
    cursor += pageSize; // advance the cursor
    const secondBatch = (await products.getAll(pageSize, cursor)).body.products;

    expect(firstBatch).toHaveLength(pageSize);
    expect(secondBatch[0]?.id).not.toBe(firstBatch[0]?.id);
  });
});
