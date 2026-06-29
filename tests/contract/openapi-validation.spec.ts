/**
 * =============================================================================
 * openapi-validation.spec.ts — Validate responses against the OpenAPI contract
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Load the OpenAPI spec, extract the response schema for an operation, and
 *   validate REAL responses against it. A live provider that honors the contract
 *   passes; a drifting provider (simulated via the mock server) fails — catching
 *   the breach before consumers do.
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

// Suite: validate real responses against schemas pulled from the OpenAPI spec.
test.describe('Phase 17 · OpenAPI contract validation', () => {
  // Happy path: a compliant live provider response validates clean.
  test('the live provider response satisfies the contract', async ({
    products,
  }) => {
    const res = await products.getById(1);
    const result = validator.validate(productSchema, res.body);
    expect(result.valid, result.errors.join('; ')).toBe(true);
  });

  // Drift detection: a mocked response with a wrong type / missing fields must fail validation.
  test('a drifting provider response VIOLATES the contract', async ({
    mock,
  }) => {
    // Simulate a provider that changed `id` to a string and dropped fields.
    mock.server.stub('GET', '/products/1', {
      body: { id: 'one', title: 'Broken' },
    });
    const res = await mock.client.get('/products/1');

    const result = validator.validate(productSchema, res.body);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/id|required/);
  });

  // Guard: requesting a schema for an operation not in the spec throws immediately.
  test('extracting a schema for an undefined operation fails fast', () => {
    expect(() => contract.getResponseSchema('/nope', 'get')).toThrow(
      /No JSON schema/,
    );
  });
});
