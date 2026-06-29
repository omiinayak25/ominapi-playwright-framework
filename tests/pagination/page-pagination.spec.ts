/**
 * =============================================================================
 * page-pagination.spec.ts — Page-based pagination (Open Brewery DB)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Page-based pagination uses page + per_page. We verify per_page is honored
 *   and that page 1 and page 2 return DIFFERENT records (no overlap), and we use
 *   the /meta endpoint to learn the true total.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 10 · Page-based pagination', () => {
  // Requesting per_page=3 must return exactly 3 records — the page size is
  // respected.
  test('per_page is honored', async ({ breweries }) => {
    const res = await breweries.getPage(1, 3);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toHaveLength(3);
  });

  // Page 1 and page 2 must share no ids, proving pages are disjoint windows
  // over the dataset.
  test('different pages return different records', async ({ breweries }) => {
    const p1 = await breweries.getPage(1, 3);
    const p2 = await breweries.getPage(2, 3);

    const ids1 = p1.body.map((b) => b.id);
    const ids2 = p2.body.map((b) => b.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  // The /meta endpoint should report a positive total, giving a reliable count
  // to drive page iteration.
  test('meta reports a positive total', async ({ breweries }) => {
    const res = await breweries.meta();
    expect(res.status).toBe(HttpStatus.OK);
    expect(Number(res.body.total)).toBeGreaterThan(0);
  });
});
