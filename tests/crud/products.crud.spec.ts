/**
 * =============================================================================
 * products.crud.spec.ts — CRUD + search via ProductService (DummyJSON)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Same CRUD lifecycle as posts, but against an API with real-world quirks:
 *   a paging ENVELOPE for lists, a non-RESTful CREATE path (/products/add), a
 *   dedicated /search endpoint, and soft-delete metadata on DELETE. The
 *   repository hides all of that — note how clean the assertions stay.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type { NewProduct } from '../../src/models/product.model.js';

// Suite: CRUD + search against DummyJSON, whose real-world quirks the repo hides.
test.describe('Phase 3 · Products CRUD (paging envelope & search)', () => {
  // GET list -> paging envelope where the page size matches the requested limit.
  test('READ ALL — returns a paging envelope honoring the limit', async ({
    products,
  }) => {
    const res = await products.getAll(5, 0);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.products.length).toBe(5); // limit applied
    expect(res.body.total).toBeGreaterThan(5); // total > page size
    expect(res.body.limit).toBe(5);
  });

  // GET by id -> 200 with the matching product.
  test('READ ONE — returns the requested product', async ({ products }) => {
    const res = await products.getById(1);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.id).toBe(1);
    expect(res.body.price).toBeGreaterThan(0);
  });

  // GET /search -> non-empty results that actually relate to the query term.
  test('SEARCH — returns products matching the query', async ({ products }) => {
    const res = await products.search('mascara');

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.products.length).toBeGreaterThan(0);
    // Every result should relate to the query (title or category).
    const first = res.body.products[0];
    expect(first).toBeDefined();
    expect(JSON.stringify(first).toLowerCase()).toContain('mascara');
  });

  // POST /products/add (non-RESTful path) -> 201 with an echoed body and new id.
  test('CREATE — POST /products/add returns a new id', async ({ products }) => {
    const payload: NewProduct = {
      title: 'OminAPI Test Widget',
      price: 42,
      category: 'tools',
    };

    const res = await products.create(payload);

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.id).toBeGreaterThan(0); // DummyJSON assigns the next id
  });

  // PUT -> updated fields reflected on the returned product.
  test('UPDATE (PUT) — replaces fields on a product', async ({ products }) => {
    const res = await products.update(1, { title: 'Renamed Product' });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe('Renamed Product');
  });

  // PATCH -> only the supplied field changes.
  test('PATCH — partial update of a product', async ({ products }) => {
    const res = await products.patch(1, { price: 999 });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.id).toBe(1);
    expect(res.body.price).toBe(999);
  });

  // DELETE -> soft delete: body carries isDeleted/deletedOn rather than vanishing.
  test('DELETE — returns the product with soft-delete metadata', async ({
    products,
  }) => {
    const res = await products.remove(1);

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.isDeleted).toBe(true);
    expect(res.body.deletedOn).toBeTruthy();
  });
});
