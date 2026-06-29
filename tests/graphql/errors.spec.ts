/**
 * =============================================================================
 * errors.spec.ts — GraphQL error handling (the 200-with-errors trap)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   GraphQL returns HTTP 200 even when the operation FAILS — the failure is in
 *   `body.errors`. A REST-style `expect(status).toBe(200)` would WRONGLY pass.
 *   We assert on the errors array, and confirm graphqlData() throws on errors.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { graphqlData } from '../../src/api-client/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

// Suite: GraphQL surfaces failures in body.errors while still returning HTTP 200.
test.describe('Phase 14 · GraphQL errors', () => {
  test.describe.configure({ retries: 2 }); // external GraphQL endpoint can blip
  // Scenario: query a field that does not exist on the type.
  // Expected: HTTP 200, but body.errors is populated and names the bad field.
  test('an invalid field yields errors despite HTTP 200', async ({
    countries,
  }) => {
    const res = await countries.query(`
      {
        country(code: "US") { nonExistentField }
      }
    `);

    // The classic trap: HTTP is 200...
    expect(res.status).toBe(HttpStatus.OK);
    // ...but the operation FAILED — proven by the errors array.
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors?.[0]?.message).toContain('nonExistentField');
  });

  // Scenario: pass an errored response through the graphqlData() helper.
  // Expected: the helper throws (rather than silently returning bad data).
  test('graphqlData() throws on an errored response', async ({ countries }) => {
    const res = await countries.query(`{ country(code: "US") { bogus } }`);
    expect(() => graphqlData(res)).toThrow(/GraphQL/);
  });
});
