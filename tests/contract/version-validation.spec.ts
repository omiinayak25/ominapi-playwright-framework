/**
 * =============================================================================
 * version-validation.spec.ts — Spec version & provider-evolution safety
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Version validation confirms (a) the contract's declared version, and (b) that
 *   a NEW provider response still satisfies the OLD contract. A provider that
 *   ADDS a field stays compatible (additionalProperties allowed); one that DROPS
 *   a required field breaks the contract.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { OpenApiContract } from '../../src/utils/openapi.js';
import { SchemaValidator } from '../../src/validators/index.js';

const contract = OpenApiContract.fromFile('product-api.openapi.json');
const productSchema = contract.getResponseSchema(
  '/products/{id}',
  'get',
  '200',
);
const validator = SchemaValidator.getInstance();

// Suite: verify the spec's version and that provider evolution stays compatible.
test.describe('Phase 17 · Version validation', () => {
  // Sanity: the contract exposes its declared semantic version.
  test('the contract declares its version', () => {
    expect(contract.version).toBe('1.0.0');
  });

  // Forward-compatible: extra fields are tolerated as long as v1 requireds remain.
  test('a v2 provider that ADDS a field stays compatible with v1 contract', async ({
    mock,
  }) => {
    // v2 response adds a new field but keeps all required v1 fields.
    mock.server.stub('GET', '/products/1', {
      body: {
        id: 1,
        title: 'Phone',
        price: 499,
        description: 'A phone',
        category: 'smartphones',
        stock: 10,
        warrantyYears: 2, // NEW in v2
      },
    });
    const res = await mock.client.get('/products/1');
    expect(validator.validate(productSchema, res.body).valid).toBe(true);
  });

  // Incompatible: removing a v1-required field fails validation against the old contract.
  test('a v2 provider that DROPS a required field breaks the contract', async ({
    mock,
  }) => {
    // v2 response removes the required `price` field.
    mock.server.stub('GET', '/products/1', {
      body: {
        id: 1,
        title: 'Phone',
        description: 'A phone',
        category: 'smartphones',
        stock: 10,
      },
    });
    const res = await mock.client.get('/products/1');
    const result = validator.validate(productSchema, res.body);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/price|required/);
  });
});
