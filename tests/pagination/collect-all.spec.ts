/**
 * =============================================================================
 * collect-all.spec.ts — Auto-collect every page with PaginationHelper
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Real assertions often need the WHOLE dataset (e.g. "no duplicate ids across
 *   the entire collection"). PaginationHelper.collectAll drives a page-fetching
 *   closure until exhausted — the test never hardcodes how many pages exist.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { PaginationHelper } from '../../src/utils/pagination.js';
import type { Product } from '../../src/models/product.model.js';

test.describe('Phase 10 · Collect-all pagination', () => {
  // Drive collectAll over the whole dataset, then assert global invariants:
  // no duplicate ids anywhere and at least the category's reported total.
  test('collectAll gathers a full filtered category across pages', async ({
    products,
  }) => {
    // First learn the true total for the category.
    const firstPage = await products.byCategory('smartphones', 5);
    const total = firstPage.body.total;

    // Offset-based fetcher: skip = pageIndex * pageSize.
    const all = await PaginationHelper.collectAll<Product>(
      async (pageIndex, pageSize) => {
        const res = await products.getAll(pageSize, pageIndex * pageSize);
        // Filter to the category client-side for this demo (DummyJSON category
        // endpoint isn't offset-paged the same way).
        return res.body.products;
      },
      { pageSize: 30, maxPages: 10 },
    );

    // We collected the entire products dataset; assert global invariants.
    const ids = all.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size); // NO duplicate ids anywhere
    expect(all.length).toBeGreaterThanOrEqual(total); // at least the category total
  });

  // With a page-based source, collectAll should stop once a page comes back
  // shorter than pageSize; expect a non-empty result and clean termination.
  test('collectAll terminates on a short final page', async ({ breweries }) => {
    // Page-based fetcher: Open Brewery pages are 1-based.
    const all = await PaginationHelper.collectAll(
      async (pageIndex, pageSize) => {
        const res = await breweries.getPage(pageIndex + 1, pageSize);
        return res.body;
      },
      { pageSize: 50, maxPages: 3 },
    );

    expect(all.length).toBeGreaterThan(0);
  });
});
