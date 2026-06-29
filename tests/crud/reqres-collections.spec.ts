/**
 * =============================================================================
 * reqres-collections.spec.ts — Testing a CUSTOM, API-key-protected endpoint
 * -----------------------------------------------------------------------------
 * TARGET:
 *   GET https://reqres.in/api/collections/products/records?project_id=33261
 *
 * WHY THIS EXAMPLE:
 *   Demonstrates the framework's "test your own API" flow against a real,
 *   protected endpoint: a config-driven base URL (`config.endpoints.reqres`),
 *   an injected client (`reqres` fixture), and API-Key auth via the Strategy
 *   pattern (`ApiKeyStrategy`).
 *
 * AUTH:
 *   ReqRes /api/* endpoints REQUIRE a registered `x-api-key` header. Without it
 *   the API returns 401 `missing_api_key`. Get a free key at
 *   https://app.reqres.in/api-keys and set REQRES_API_KEY in .env to enable the
 *   happy-path test (it is skipped automatically when the key is absent).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { ApiKeyStrategy, NoAuthStrategy } from '../../src/auth/index.js';
import { expectMatchesSchema } from '../../src/validators/index.js';
import { reqresRecordsSchema } from '../../src/schemas/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type {
  ReqResCollection,
  ProductRecordData,
} from '../../src/models/reqres.model.js';

const PATH = '/api/collections/products/records';
const PROJECT_ID = '33261';
const API_KEY = process.env.REQRES_API_KEY;

// Suite: prove the framework can test a custom, API-key-protected endpoint.
test.describe('ReqRes collections (custom API-key example)', () => {
  test.describe.configure({ retries: 2 }); // public API — absorb transient blips

  // Negative auth: omitting the key (NoAuthStrategy) -> 401 missing_api_key.
  test('is protected: returns 401 without an API key', async ({ reqres }) => {
    const res = await reqres.get(PATH, {
      params: { project_id: PROJECT_ID },
      auth: new NoAuthStrategy(),
    });

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body).toMatchObject({ error: 'missing_api_key' });
  });

  // Happy path (skipped without a key): a valid x-api-key returns schema-valid records.
  test('returns records when a valid API key is supplied', async ({
    reqres,
  }) => {
    test.skip(
      !API_KEY,
      'Set REQRES_API_KEY in .env (free at https://app.reqres.in/api-keys) to run this.',
    );

    const res = await reqres.get<ReqResCollection<ProductRecordData>>(PATH, {
      params: { project_id: PROJECT_ID },
      auth: new ApiKeyStrategy('x-api-key', API_KEY as string),
    });

    expect(res.status).toBe(HttpStatus.OK);
    // Response conforms to the declared contract.
    expectMatchesSchema(res, reqresRecordsSchema);

    // Records are present and carry the expected nested product payload.
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(first?.project_id).toBe(Number(PROJECT_ID));
    expect(typeof first?.data.name).toBe('string');
    expect(typeof first?.data.price).toBe('number');
  });
});
